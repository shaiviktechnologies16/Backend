import { ProviderError } from "../../common/errors/ProviderError.js";

export class AIWorkerPool {
  constructor({ getPlatformConfigUseCase }) {
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.workers = [];
    this.configCacheExpiresAt = 0;
    this.healthCacheTtlMs = 30_000;
  }

  async getWorkers() {
    if (this.workers.length > 0 && Date.now() < this.configCacheExpiresAt) {
      return this.workers;
    }

    const [workersConfigStr, baseUrl, defaultModel] = await Promise.all([
      this.getPlatformConfigUseCase.getValue("AI_WORKERS"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_BASE_URL"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_MODEL"),
    ]);

    let rawWorkers = [];

    if (workersConfigStr && workersConfigStr.trim()) {
      try {
        rawWorkers = JSON.parse(workersConfigStr);
      } catch (err) {
        console.warn(
          "[AIWorkerPool] Failed to parse AI_WORKERS config JSON, falling back to default worker.",
          err,
        );
      }
    }

    if (!Array.isArray(rawWorkers) || rawWorkers.length === 0) {
      rawWorkers = [
        {
          id: "ollama-default",
          provider: "ollama",
          baseUrl: baseUrl || "http://127.0.0.1:11434",
          model: defaultModel || "qwen3:8b",
          enabled: true,
        },
      ];
    }

    const existingMap = new Map(this.workers.map((w) => [w.id, w]));

    this.workers = rawWorkers.map((w, index) => {
      const id = w.id || `worker-${index + 1}`;
      const existing = existingMap.get(id);

      return {
        id,
        provider: (w.provider || "ollama").toLowerCase(),
        baseUrl: w.baseUrl || "http://127.0.0.1:11434",
        model: w.model || defaultModel || "qwen3:8b",
        enabled: w.enabled !== false,
        healthStatus: existing ? existing.healthStatus : "UNKNOWN",
        activeRequests: existing ? Math.max(0, existing.activeRequests) : 0,
        lastHealthCheckAt: existing ? existing.lastHealthCheckAt : 0,
        lastFailureAt: existing ? existing.lastFailureAt : 0,
      };
    });

    this.configCacheExpiresAt = Date.now() + 60_000;
    return this.workers;
  }

  async checkWorkerHealth(worker) {
    if (!worker.enabled) {
      worker.healthStatus = "DISABLED";
      return worker.healthStatus;
    }

    if (
      worker.healthStatus !== "UNKNOWN" &&
      Date.now() - worker.lastHealthCheckAt < this.healthCacheTtlMs
    ) {
      return worker.healthStatus;
    }

    const startedAt = Date.now();

    try {
      if (worker.provider === "ollama") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${worker.baseUrl}/api/tags`, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          worker.healthStatus = "UNHEALTHY";
        } else {
          const data = await response.json();
          const models = data.models || [];

          worker.healthStatus =
            Array.isArray(models) && models.length > 0
              ? "HEALTHY"
              : "UNHEALTHY";
        }
      } else {
        worker.healthStatus = "HEALTHY";
      }
    } catch {
      worker.healthStatus = "UNHEALTHY";
      worker.lastFailureAt = Date.now();
    }

    worker.lastHealthCheckAt = Date.now();

    console.log("[AI WORKER HEALTH CHECK]", {
      workerId: worker.id,
      provider: worker.provider,
      baseUrl: worker.baseUrl,
      model: worker.model,
      status: worker.healthStatus,
      durationMs: Date.now() - startedAt,
    });

    return worker.healthStatus;
  }

  async selectWorker({ provider = "ollama", model }) {
    const workers = await this.getWorkers();

    const providerWorkers = workers.filter(
      (w) => w.enabled && w.provider === provider.toLowerCase(),
    );

    if (providerWorkers.length === 0) {
      throw new ProviderError(
        `No AI workers configured for provider "${provider}".`,
      );
    }

    await Promise.all(
      providerWorkers.map(async (w) => {
        if (
          w.healthStatus === "UNKNOWN" ||
          Date.now() - w.lastHealthCheckAt > this.healthCacheTtlMs
        ) {
          await this.checkWorkerHealth(w);
        }
      }),
    );

    let eligibleWorkers = providerWorkers.filter(
      (w) => w.healthStatus === "HEALTHY",
    );

    if (model) {
      const targetModel = model.toLowerCase();
      const modelMatched = eligibleWorkers.filter(
        (w) =>
          w.model.toLowerCase().includes(targetModel) ||
          targetModel.includes(w.model.toLowerCase()),
      );

      if (modelMatched.length > 0) {
        eligibleWorkers = modelMatched;
      }
    }

    if (eligibleWorkers.length === 0) {
      for (const w of providerWorkers) {
        const status = await this.checkWorkerHealth(w);
        if (status === "HEALTHY") {
          eligibleWorkers.push(w);
        }
      }
    }

    if (eligibleWorkers.length === 0) {
      throw new ProviderError(
        `All AI inference workers for provider "${provider}" and model "${
          model || "default"
        }" are currently UNHEALTHY or unavailable.`,
      );
    }

    eligibleWorkers.sort((a, b) => a.activeRequests - b.activeRequests);

    const selectedWorker = eligibleWorkers[0];

    return selectedWorker;
  }
}
