/**
 * ModelFailoverManager
 * Centralized model routing, capability validation, health tracking, and failover orchestration.
 */

export class ModelFailoverManager {
  constructor({
    primaryModel = null,
    fallbackModels = null,
    cooldownMs = 60_000,
    maxConsecutiveFailures = 1,
  } = {}) {
    this.defaultPrimaryModel =
      primaryModel ||
      process.env.OPENAI_MODEL ||
      "nvidia/nemotron-3-super-120b-a12b:free";

    this.rawFallbackConfig =
      fallbackModels ??
      process.env.OPENAI_FALLBACK_MODELS ??
      "nvidia/nemotron-3.5-super-vl:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

    this.cooldownMs = Number(
      process.env.MODEL_FAILOVER_COOLDOWN_MS || cooldownMs,
    );
    this.maxConsecutiveFailures = maxConsecutiveFailures;

    // Model health registry: Map<string, { consecutiveFailures, lastFailureAt, cooldownUntil, totalSuccesses, totalFailures, lastError }>
    this.healthMap = new Map();

    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      primarySuccesses: 0,
      fallbackActivations: 0,
      fallbackSuccesses: 0,
      totalExhaustedFailures: 0,
    };
  }

  /**
   * Models strictly reserved for embeddings; never eligible for conversational chat.
   */
  static EMBEDDING_MODELS = new Set([
    "nvidia/nemotron-3-embed-1b:free",
    "nomic-embed-text:latest",
    "text-embedding-3-small",
    "text-embedding-3-large",
    "text-embedding-ada-002",
  ]);

  /**
   * Resolves the primary chat model.
   */
  getPrimaryModel() {
    const envPrimary = process.env.OPENAI_MODEL;
    return (
      envPrimary && envPrimary.trim() ? envPrimary.trim() : this.defaultPrimaryModel
    );
  }

  /**
   * Resolves the fallback models list from configuration or environment.
   */
  getFallbackModels() {
    const raw =
      process.env.OPENAI_FALLBACK_MODELS !== undefined
        ? process.env.OPENAI_FALLBACK_MODELS
        : this.rawFallbackConfig;

    if (Array.isArray(raw)) {
      return raw.map((m) => String(m).trim()).filter(Boolean);
    }

    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m && !ModelFailoverManager.EMBEDDING_MODELS.has(m));
    }

    return [];
  }

  /**
   * Normalizes legacy model IDs or aliases into canonical model strings.
   */
  normalizeModelId(modelId) {
    if (!modelId) return this.getPrimaryModel();

    const normalized = modelId.trim();
    if (
      normalized === "qwen3:8b" ||
      normalized === "qwen2.5vl:7b" ||
      normalized === "gpt-4o-mini" ||
      normalized === "nemotron-3-super-120b-a12b:free" ||
      normalized === "nvidia/nemotron-3-super-120b:free"
    ) {
      return this.getPrimaryModel();
    }

    return normalized;
  }

  /**
   * Detects request requirements such as multimodal vision inputs or tool definitions.
   */
  detectRequirements({ messages = [], tools = [] } = {}) {
    let hasVision = false;

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg) continue;
        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (
              part?.type === "image_url" ||
              part?.type === "image" ||
              part?.image_url
            ) {
              hasVision = true;
              break;
            }
          }
        } else if (msg.attachments && Array.isArray(msg.attachments)) {
          for (const att of msg.attachments) {
            if (
              att?.type?.startsWith("image/") ||
              att?.mimeType?.startsWith("image/") ||
              att?.fileType?.startsWith("image/")
            ) {
              hasVision = true;
              break;
            }
          }
        }
        if (hasVision) break;
      }
    }

    const hasTools = Array.isArray(tools) && tools.length > 0;

    return { hasVision, hasTools };
  }

  /**
   * Verifies if a given model supports the specified request requirements.
   */
  isModelCompatible(modelId, requirements = {}) {
    if (!modelId) return false;

    // Strict exclusion of embedding models
    if (
      ModelFailoverManager.EMBEDDING_MODELS.has(modelId) ||
      modelId.includes("embed")
    ) {
      return false;
    }

    // Vision / Multimodal requirement check
    if (requirements.hasVision) {
      const lower = modelId.toLowerCase();
      const supportsVision =
        lower.includes("vl") ||
        lower.includes("vision") ||
        lower.includes("4o") ||
        lower.includes("gemini") ||
        lower.includes("super-vl");

      if (!supportsVision) {
        return false;
      }
    }

    return true;
  }

  /**
   * Inspects whether a model is currently in a temporary failure cooldown.
   */
  isCoolingDown(modelId) {
    const health = this.healthMap.get(modelId);
    if (!health) return false;
    return health.cooldownUntil > Date.now();
  }

  /**
   * Resolves the prioritized candidate chain of models for a request.
   */
  getCandidateChain({ requestedModel = null, messages = [], tools = [] } = {}) {
    const requirements = this.detectRequirements({ messages, tools });
    const primary = this.normalizeModelId(requestedModel || this.getPrimaryModel());
    const fallbacks = this.getFallbackModels();

    // Assemble unified candidates list without duplicates
    const rawCandidates = [primary, ...fallbacks];
    const uniqueCandidates = [];
    const seen = new Set();

    for (const model of rawCandidates) {
      if (!model || seen.has(model)) continue;
      seen.add(model);
      uniqueCandidates.push(model);
    }

    // Filter by capabilities and modality
    let eligible = uniqueCandidates.filter((model) =>
      this.isModelCompatible(model, requirements),
    );

    // If requirements (e.g. vision) filtered out all configured models, attempt to find any fallback supporting it
    if (eligible.length === 0 && requirements.hasVision) {
      const visionFallback = "nvidia/nemotron-3.5-super-vl:free";
      if (!seen.has(visionFallback)) {
        eligible.push(visionFallback);
      }
    }

    // Fallback safeguard: never leave candidate list empty
    if (eligible.length === 0) {
      eligible = [primary];
    }

    // Partition by cooldown status
    const active = [];
    const cooledDown = [];

    for (const model of eligible) {
      if (this.isCoolingDown(model)) {
        cooledDown.push(model);
      } else {
        active.push(model);
      }
    }

    // If all models are cooling down, sort cooledDown by earliest cooldown expiry to avoid complete starvation
    if (active.length === 0) {
      cooledDown.sort((a, b) => {
        const hA = this.healthMap.get(a)?.cooldownUntil || 0;
        const hB = this.healthMap.get(b)?.cooldownUntil || 0;
        return hA - hB;
      });
      return cooledDown;
    }

    // Active models first, followed by cooled down models as last-resort fallbacks
    return [...active, ...cooledDown];
  }

  /**
   * Records a successful request for a model, clearing its cooldown.
   */
  recordSuccess(modelId, { isFallback = false } = {}) {
    this.metrics.totalRequests++;
    if (isFallback) {
      this.metrics.fallbackSuccesses++;
    } else {
      this.metrics.primarySuccesses++;
    }

    const health = this.healthMap.get(modelId) || {
      consecutiveFailures: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastFailureAt: null,
      cooldownUntil: 0,
    };

    health.consecutiveFailures = 0;
    health.cooldownUntil = 0;
    health.totalSuccesses = (health.totalSuccesses || 0) + 1;
    this.healthMap.set(modelId, health);
  }

  /**
   * Records a retryable failure for a model, putting it on cooldown if threshold is met.
   */
  recordFailure(modelId, error) {
    const health = this.healthMap.get(modelId) || {
      consecutiveFailures: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastFailureAt: null,
      cooldownUntil: 0,
    };

    health.consecutiveFailures = (health.consecutiveFailures || 0) + 1;
    health.totalFailures = (health.totalFailures || 0) + 1;
    health.lastFailureAt = Date.now();
    health.lastError = {
      message: error?.message,
      status: error?.status || error?.statusCode,
      code: error?.code,
      timestamp: new Date().toISOString(),
    };

    if (health.consecutiveFailures >= this.maxConsecutiveFailures) {
      health.cooldownUntil = Date.now() + this.cooldownMs;
      console.warn(
        `[MODEL_FAILOVER] Model "${modelId}" entered failure cooldown for ${Math.round(this.cooldownMs / 1000)}s due to upstream error (${error?.status || error?.code || error?.message}).`,
      );
    }

    this.healthMap.set(modelId, health);
  }

  /**
   * Records that a fallback transition occurred.
   */
  recordFallbackActivation(fromModel, toModel) {
    this.metrics.fallbackActivations++;
    console.warn(
      `[MODEL_FAILOVER] Activating failover from "${fromModel}" to fallback model "${toModel}".`,
    );
  }

  /**
   * Records when all eligible models in the chain failed.
   */
  recordExhaustedFailures() {
    this.metrics.totalExhaustedFailures++;
  }

  /**
   * Resets all health statuses and cooldowns (useful for manual intervention or testing).
   */
  resetHealth() {
    this.healthMap.clear();
  }

  /**
   * Retrieves operational health and observability metrics.
   */
  getMetrics() {
    const healthReport = {};
    for (const [model, health] of this.healthMap.entries()) {
      healthReport[model] = {
        consecutiveFailures: health.consecutiveFailures,
        totalSuccesses: health.totalSuccesses,
        totalFailures: health.totalFailures,
        isCoolingDown: health.cooldownUntil > Date.now(),
        cooldownRemainingMs: Math.max(0, health.cooldownUntil - Date.now()),
        lastError: health.lastError,
      };
    }

    return {
      metrics: { ...this.metrics },
      health: healthReport,
      configuredPrimary: this.getPrimaryModel(),
      configuredFallbacks: this.getFallbackModels(),
    };
  }
}

