import OpenAI from "openai";
import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";
import { ProviderConcurrencyLimiter } from "../concurrency/provider-concurrency-limiter.js";
import { ProviderRateLimiter } from "../concurrency/provider-rate-limiter.js";
import { ModelFailoverManager } from "./model-failover-manager.js";

export class OpenAIProvider extends AIProvider {
  constructor({
    getPlatformApiKeyValueUseCase = null,
    limiter = null,
    rateLimiter = null,
    redisClient = null,
    failoverManager = null,
  } = {}) {
    super();

    this.getPlatformApiKeyValueUseCase = getPlatformApiKeyValueUseCase;

    // 1. Failover Manager: dynamic fallback chain, capabilities & health tracking
    this.failoverManager = failoverManager || new ModelFailoverManager();

    // 2. Concurrency Limiter: bounds active in-flight parallel executions (default 5)
    this.limiter =
      limiter ||
      new ProviderConcurrencyLimiter({
        name: "openai-concurrency",
        maxConcurrency: Number(
          process.env.OPENAI_MAX_CONCURRENCY ||
            process.env.OPENROUTER_MAX_CONCURRENCY ||
            5,
        ),
        maxQueueSize: Number(process.env.OPENAI_MAX_QUEUE_SIZE || 50),
        queueTimeoutMs: Number(process.env.OPENAI_QUEUE_TIMEOUT_MS || 30000),
      });

    // 3. Rate Limiter: strictly enforces Requests Per Minute ceiling (default 20 RPM for OpenRouter free)
    this.rateLimiter =
      rateLimiter ||
      new ProviderRateLimiter({
        name: "openai-rpm",
        requestsPerMinute: Number(
          process.env.OPENROUTER_RPM ||
            process.env.OPENAI_RPM ||
            20,
        ),
        windowMs: 60000,
        maxWaitMs: Number(process.env.OPENAI_RATE_LIMIT_WAIT_MS || 25000),
        maxQueueSize: Number(process.env.OPENAI_RATE_LIMIT_MAX_QUEUE || 50),
        redisClient,
        failPolicy: process.env.REDIS_RATELIMIT_FAIL_POLICY || "local_fallback",
      });
  }

  get name() {
    return "openai";
  }

  get model() {
    return this.failoverManager.getPrimaryModel();
  }

  get maxContextMessages() {
    return 30;
  }

  _resolveModel(model) {
    return this.failoverManager.normalizeModelId(model || this.model);
  }

  getConcurrencyMetrics() {
    return {
      concurrency: this.limiter?.getMetrics() || null,
      rateLimiter: this.rateLimiter?.getMetrics() || null,
      failover: this.failoverManager?.getMetrics() || null,
    };
  }

  async getClient() {
    let apiKey = null;

    if (this.getPlatformApiKeyValueUseCase) {
      try {
        apiKey = await this.getPlatformApiKeyValueUseCase.execute("openai");
      } catch (keyErr) {
        apiKey =
          process.env.OPENROUTER_API_KEY?.trim() ||
          process.env.OPENAI_API_KEY?.trim() ||
          null;
        if (!apiKey) {
          throw new ProviderError(
            "OpenAI-compatible provider API key is not configured in database or environment.",
            { cause: keyErr },
          );
        }
      }
    } else {
      apiKey =
        process.env.OPENROUTER_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        null;
    }

    if (!apiKey) {
      throw new ProviderError(
        "OpenAI-compatible provider API key is not configured.",
      );
    }

    const baseURL = process.env.OPENAI_BASE_URL?.trim();
    const appName = process.env.OPENROUTER_APP_NAME || "Shaivik AI SaaS";
    const siteUrl =
      process.env.OPENROUTER_SITE_URL || "https://shaiviktechnologies.in";

    return new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      ...(baseURL?.includes("openrouter.ai")
        ? {
            defaultHeaders: {
              "HTTP-Referer": siteUrl,
              "X-Title": appName,
              "X-OpenRouter-Title": appName,
            },
          }
        : {}),
    });
  }

  _extractRetryAfter(error) {
    if (!error) return null;
    const headers = error.headers || error.response?.headers;
    if (headers) {
      const headerVal =
        typeof headers.get === "function"
          ? headers.get("retry-after")
          : headers["retry-after"] || headers["Retry-After"];
      if (headerVal) {
        const parsed = Number(headerVal);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return null;
  }

  _isTransientError(error) {
    if (!error) return false;
    if (error.name === "AbortError" || error.code === "ABORT_ERR") return false;

    // Daily quota exhaustion, insufficient credits, or authorization errors are NOT transient
    const status =
      error.status ||
      error.statusCode ||
      error.upstreamStatus ||
      error.cause?.status ||
      error.cause?.statusCode;

    if (status === 400 || status === 401 || status === 402 || status === 403) {
      return false;
    }

    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("quota") ||
      msg.includes("daily limit") ||
      msg.includes("credit balance") ||
      msg.includes("insufficient funds") ||
      msg.includes("insufficient credits") ||
      msg.includes("billing")
    ) {
      return false;
    }

    if (
      status === 502 ||
      status === 503 ||
      status === 504 ||
      status === 530 ||
      status === 429 ||
      status === 404 ||
      (typeof status === "number" && status >= 500 && status <= 599)
    ) {
      return true;
    }

    const code = error.code || error.cause?.code;
    if (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "ECONNREFUSED" ||
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      code === "ERR_STREAM_PREMATURE_CLOSE"
    ) {
      return true;
    }

    if (
      error.type === "system" ||
      msg.includes("530") ||
      msg.includes("524") ||
      msg.includes("520") ||
      msg.includes("404") ||
      msg.includes("not found") ||
      msg.includes("provider returned error") ||
      msg.includes("no available provider") ||
      msg.includes("origin dns error") ||
      msg.includes("fetch failed") ||
      msg.includes("bad gateway") ||
      msg.includes("service unavailable") ||
      msg.includes("gateway timeout") ||
      msg.includes("internal server error") ||
      msg.includes("stream connection interrupted") ||
      msg.includes("terminated") ||
      msg.includes("premature close")
    ) {
      return true;
    }

    return false;
  }

  async chat(messages, options = {}) {
    const candidates = this.failoverManager.getCandidateChain({
      requestedModel: options.model,
      messages,
      tools: options.tools,
    });

    let client = null;
    try {
      client = await this.getClient();
    } catch (clientErr) {
      if (clientErr instanceof ProviderError) throw clientErr;
      throw new ProviderError("Unable to initialize AI provider client.", {
        provider: this.name,
        model: candidates[0],
        cause: clientErr,
      });
    }

    let lastError = null;

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
      const activeModel = candidates[cIdx];
      const isFallback = cIdx > 0;

      // Acquire rate limiter permit
      const refundRateToken = await this.rateLimiter.acquire({
        signal: options.signal,
        model: activeModel,
        provider: this.name,
      });

      let isDispatched = false;
      const safeRefund = () => {
        if (!isDispatched && typeof refundRateToken === "function") {
          try {
            refundRateToken();
          } catch (err) {
            console.warn("[RATE_LIMIT_REFUND_ERROR]", err.message);
          }
        }
      };

      let releaseConcurrencySlot = null;
      try {
        releaseConcurrencySlot = await this.limiter.acquire({
          signal: options.signal,
          model: activeModel,
          provider: this.name,
        });
      } catch (concurrencyErr) {
        safeRefund();
        throw concurrencyErr;
      }

      try {
        isDispatched = true;

        const createParams = {
          model: activeModel,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        };

        if (Array.isArray(options.tools) && options.tools.length > 0) {
          createParams.tools = options.tools;
          createParams.tool_choice = options.toolChoice || "auto";
        }

        if (
          activeModel.includes("nemotron") ||
          activeModel.includes("reasoning")
        ) {
          createParams.reasoning = { effort: "none" };
        }

        const completion = await client.chat.completions.create(createParams, {
          signal: options.signal,
        });

        // Ensure returned object is valid
        if (!completion || (!completion.choices && !completion.message)) {
          throw new ProviderError("AI provider returned empty or malformed completion.", {
            provider: this.name,
            model: activeModel,
          });
        }

        // Attach actual responding model name and ensure both choices and message access work
        completion.model = activeModel;
        if (completion.choices?.[0]?.message && !completion.message) {
          completion.message = completion.choices[0].message;
        }

        this.failoverManager.recordSuccess(activeModel, { isFallback });
        return completion;
      } catch (error) {
        lastError = error;

        if (error.name === "AbortError" || options.signal?.aborted) {
          throw error;
        }

        const isTransient = this._isTransientError(error);
        const retryAfterSec = this._extractRetryAfter(error);

        if (retryAfterSec && retryAfterSec > 0) {
          const delayMs = retryAfterSec * 1000;
          this.limiter.pauseFor(delayMs);
          this.rateLimiter.pauseFor(delayMs);
        }

        console.warn("[OPENAI CHAT ATTEMPT FAILED]", {
          model: activeModel,
          isFallback,
          nextCandidate: candidates[cIdx + 1] || null,
          isTransient,
          status: error.status || error.statusCode,
          code: error.code,
          message: error.message,
          retryAfterSec,
        });

        // Client errors (400, 401, 403, quota exhaustion) must fail immediately without burning fallbacks
        if (!isTransient) {
          if (error instanceof ProviderError) throw error;
          throw new ProviderError(
            `AI provider rejected request (${error.status || error.code || "client error"}): ${error.message}`,
            {
              provider: this.name,
              model: activeModel,
              upstreamStatus: error.status,
              isTransient: false,
              cause: error,
            },
          );
        }

        this.failoverManager.recordFailure(activeModel, error);

        // If there's an eligible fallback model in chain, activate it
        if (cIdx < candidates.length - 1) {
          const nextModel = candidates[cIdx + 1];
          this.failoverManager.recordFallbackActivation(activeModel, nextModel);
          const backoffMs = Math.min(1000, 200 * (cIdx + 1));
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
      } finally {
        if (releaseConcurrencySlot) {
          releaseConcurrencySlot();
        }
      }
    }

    // All fallback models in chain were exhausted
    this.failoverManager.recordExhaustedFailures();
    throw new ProviderError(
      `Unable to generate response from AI provider. All fallback models failed (${lastError?.status || lastError?.code || "unavailable"}).`,
      {
        provider: this.name,
        model: candidates[0],
        attemptedModels: candidates,
        upstreamStatus: lastError?.status,
        isTransient: true,
        cause: lastError,
      },
    );
  }

  async *stream(messages, options = {}) {
    const candidates = this.failoverManager.getCandidateChain({
      requestedModel: options.model,
      messages,
      tools: options.tools,
    });

    let client = null;
    try {
      client = await this.getClient();
    } catch (clientErr) {
      if (clientErr instanceof ProviderError) throw clientErr;
      throw new ProviderError("Unable to initialize AI provider client.", {
        provider: this.name,
        model: candidates[0],
        cause: clientErr,
      });
    }

    let lastError = null;

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
      const activeModel = candidates[cIdx];
      const isFallback = cIdx > 0;

      // Acquire rate limiter permit
      const refundRateToken = await this.rateLimiter.acquire({
        signal: options.signal,
        model: activeModel,
        provider: this.name,
      });

      let isDispatched = false;
      const safeRefund = () => {
        if (!isDispatched && typeof refundRateToken === "function") {
          try {
            refundRateToken();
          } catch (err) {
            console.warn("[RATE_LIMIT_REFUND_ERROR]", err.message);
          }
        }
      };

      let releaseConcurrencySlot = null;
      try {
        releaseConcurrencySlot = await this.limiter.acquire({
          signal: options.signal,
          model: activeModel,
          provider: this.name,
        });
      } catch (concurrencyErr) {
        safeRefund();
        throw concurrencyErr;
      }

      let tokensEmitted = 0;

      try {
        isDispatched = true;

        const createParams = {
          model: activeModel,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          stream: true,
          stream_options: {
            include_usage: true,
          },
        };

        if (Array.isArray(options.tools) && options.tools.length > 0) {
          createParams.tools = options.tools;
          createParams.tool_choice = options.toolChoice || "auto";
        }

        // Optimize OpenRouter reasoning models to achieve sub-second TTFB
        if (
          activeModel.includes("nemotron") ||
          activeModel.includes("reasoning")
        ) {
          createParams.reasoning = { effort: "none" };
        }

        const stream = await client.chat.completions.create(createParams, {
          signal: options.signal,
        });

        // Yield model metadata event first so callers know the responding model
        yield {
          type: "model",
          model: activeModel,
          isFallback,
        };

        const toolCallsMap = new Map();

        for await (const chunk of stream) {
          if (options.signal?.aborted) {
            return;
          }

          const delta = chunk.choices?.[0]?.delta;
          const content = delta?.content;

          if (typeof content === "string" && content) {
            tokensEmitted++;
            yield {
              type: "token",
              content,
            };
          }

          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, {
                  id: tc.id || `call_${Date.now()}_${idx}`,
                  type: tc.type || "function",
                  function: {
                    name: tc.function?.name || "",
                    arguments: tc.function?.arguments || "",
                  },
                });
              } else {
                const existing = toolCallsMap.get(idx);
                if (tc.id && !existing.id) existing.id = tc.id;
                if (tc.function?.name) existing.function.name += tc.function.name;
                if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
              }
            }
          }

          if (chunk.usage) {
            const inputTokens = chunk.usage.prompt_tokens ?? 0;
            const outputTokens = chunk.usage.completion_tokens ?? 0;

            yield {
              type: "usage",
              model: activeModel,
              usage: {
                inputTokens,
                outputTokens,
                totalTokens:
                  chunk.usage.total_tokens ?? inputTokens + outputTokens,
              },
            };
          }
        }

        if (toolCallsMap.size > 0) {
          const accumulatedToolCalls = Array.from(toolCallsMap.values());
          yield {
            type: "tool_calls",
            toolCalls: accumulatedToolCalls,
            model: activeModel,
          };
        }

        // Stream completed successfully!
        this.failoverManager.recordSuccess(activeModel, { isFallback });
        return;
      } catch (streamErr) {
        lastError = streamErr;

        if (streamErr.name === "AbortError" || options.signal?.aborted) {
          return;
        }

        const isTransient = this._isTransientError(streamErr);
        const retryAfterSec = this._extractRetryAfter(streamErr);

        if (retryAfterSec && retryAfterSec > 0) {
          const delayMs = retryAfterSec * 1000;
          this.limiter.pauseFor(delayMs);
          this.rateLimiter.pauseFor(delayMs);
        }

        console.warn("[OPENAI STREAM ATTEMPT FAILED]", {
          activeModel,
          isFallback,
          tokensEmitted,
          isTransient,
          status: streamErr.status || streamErr.statusCode,
          code: streamErr.code,
          message: streamErr.message,
          retryAfterSec,
        });

        // CRITICAL: If tokens were ALREADY emitted to caller, we CANNOT restart stream
        // with another model because it would corrupt/duplicate text on the client.
        if (tokensEmitted > 0) {
          throw new ProviderError(
            `Stream connection interrupted by AI provider (${streamErr.status || streamErr.statusCode || streamErr.code || "530"}).`,
            {
              provider: this.name,
              model: activeModel,
              upstreamStatus: streamErr.status || streamErr.statusCode || 530,
              isTransient,
              tokensEmitted: true,
              tokensEmittedCount: tokensEmitted,
              cause: streamErr,
            },
          );
        }

        // Non-transient errors (400, 401, 403, quota) must not trigger fallbacks
        if (!isTransient) {
          if (streamErr instanceof ProviderError) throw streamErr;
          throw new ProviderError(
            `AI provider rejected streaming request (${streamErr.status || streamErr.code || "client error"}): ${streamErr.message}`,
            {
              provider: this.name,
              model: activeModel,
              upstreamStatus: streamErr.status || streamErr.statusCode,
              isTransient: false,
              tokensEmitted: false,
              cause: streamErr,
            },
          );
        }

        this.failoverManager.recordFailure(activeModel, streamErr);

        // If 0 tokens were emitted and fallback is available, attempt next candidate
        if (cIdx < candidates.length - 1) {
          const nextModel = candidates[cIdx + 1];
          this.failoverManager.recordFallbackActivation(activeModel, nextModel);
          const backoffMs = Math.min(1000, 200 * (cIdx + 1));
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
      } finally {
        if (releaseConcurrencySlot) {
          releaseConcurrencySlot();
        }
      }
    }

    // All fallback models in chain were exhausted
    this.failoverManager.recordExhaustedFailures();
    throw new ProviderError(
      `Unable to stream from AI provider. All fallback models failed (${lastError?.status || lastError?.code || "unavailable"}).`,
      {
        provider: this.name,
        model: candidates[0],
        attemptedModels: candidates,
        upstreamStatus: lastError?.status || lastError?.statusCode,
        isTransient: true,
        tokensEmitted: false,
        cause: lastError,
      },
    );
  }
}
