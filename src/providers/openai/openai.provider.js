import OpenAI from "openai";
import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";
import { ProviderConcurrencyLimiter } from "../concurrency/provider-concurrency-limiter.js";
import { ProviderRateLimiter } from "../concurrency/provider-rate-limiter.js";

export class OpenAIProvider extends AIProvider {
  constructor({
    getPlatformApiKeyValueUseCase,
    limiter = null,
    rateLimiter = null,
    redisClient = null,
  }) {
    super();

    this.getPlatformApiKeyValueUseCase = getPlatformApiKeyValueUseCase;

    // 1. Concurrency Limiter: bounds active in-flight parallel executions (default 5)
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

    // 2. Rate Limiter: strictly enforces Requests Per Minute ceiling (default 20 RPM for OpenRouter free)
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
    return process.env.OPENAI_MODEL || "nemotron-3-super-120b-a12b:free";
  }

  get maxContextMessages() {
    return 30;
  }

  getConcurrencyMetrics() {
    return {
      concurrency: this.limiter?.getMetrics() || null,
      rateLimiter: this.rateLimiter?.getMetrics() || null,
    };
  }

  async getClient() {
    const apiKey = await this.getPlatformApiKeyValueUseCase.execute("openai");

    if (!apiKey) {
      throw new ProviderError(
        "OpenAI-compatible provider API key is not configured.",
      );
    }

    const baseURL = process.env.OPENAI_BASE_URL?.trim();

    return new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      ...(baseURL?.includes("openrouter.ai")
        ? {
            defaultHeaders: {
              "HTTP-Referer":
                process.env.OPENROUTER_SITE_URL ||
                "https://shaiviktechnologies.in",
              "X-OpenRouter-Title": "Shaivik AI",
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
    const status = error.status || error.statusCode;
    if (status === 401 || status === 402 || status === 403) {
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
      status === 429 ||
      (typeof status === "number" && status >= 520)
    ) {
      return true;
    }

    const code = error.code || error.cause?.code;
    if (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "ECONNREFUSED" ||
      code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return true;
    }

    if (
      error.type === "system" ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("Bad Gateway") ||
      error.message?.includes("Service Unavailable") ||
      error.message?.includes("Gateway Timeout")
    ) {
      return true;
    }

    return false;
  }

  async chat(messages, options = {}) {
    const targetModel = options.model || this.model;
    const maxRetries = 2;
    let client = null;

    try {
      client = await this.getClient();
    } catch (clientErr) {
      if (clientErr instanceof ProviderError) throw clientErr;
      throw new ProviderError("Unable to initialize AI provider client.", {
        provider: this.name,
        model: targetModel,
        cause: clientErr,
      });
    }

    // Step 1: Acquire rate limiter permit FIRST without occupying a concurrency slot
    const refundRateToken = await this.rateLimiter.acquire({
      signal: options.signal,
      model: targetModel,
      provider: this.name,
    });

    let isDispatched = false;
    const safeRefund = () => {
      // Guard: Never refund after request has been dispatched upstream to the provider!
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
      // Step 2: Acquire concurrency slot from bounded limiter queue
      releaseConcurrencySlot = await this.limiter.acquire({
        signal: options.signal,
        model: targetModel,
        provider: this.name,
      });
    } catch (concurrencyErr) {
      safeRefund();
      throw concurrencyErr;
    }

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await this.rateLimiter.acquire({
            signal: options.signal,
            model: targetModel,
            provider: this.name,
          });
        }

        try {
          // Mark as dispatched immediately before calling upstream client
          isDispatched = true;

          return await client.chat.completions.create(
            {
              model: targetModel,
              messages,
              temperature: options.temperature,
              max_tokens: options.maxTokens,
            },
            {
              signal: options.signal,
            },
          );
        } catch (error) {
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
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            isTransient,
            status: error.status,
            code: error.code,
            message: error.message,
            retryAfterSec,
            model: targetModel,
          });

          if (!isTransient || attempt >= maxRetries) {
            if (error instanceof ProviderError) {
              throw error;
            }

            throw new ProviderError(
              `Unable to generate response from AI provider (${error.status || error.code || "upstream error"}).`,
              {
                provider: this.name,
                model: targetModel,
                upstreamStatus: error.status,
                isTransient,
                cause: error,
              },
            );
          }

          const baseBackoff = Math.min(2000, 400 * Math.pow(2, attempt));
          const jitter = Math.floor(Math.random() * 200);
          const backoffMs =
            retryAfterSec && retryAfterSec > 0
              ? Math.min(retryAfterSec * 1000, 5000)
              : baseBackoff + jitter;

          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    } finally {
      if (releaseConcurrencySlot) {
        releaseConcurrencySlot();
      }
    }
  }

  async *stream(messages, options = {}) {
    const targetModel = options.model || this.model;
    const maxRetries = 2;
    let client = null;
    let stream = null;

    try {
      client = await this.getClient();
    } catch (clientErr) {
      if (clientErr instanceof ProviderError) throw clientErr;
      throw new ProviderError("Unable to initialize AI provider client.", {
        provider: this.name,
        model: targetModel,
        cause: clientErr,
      });
    }

    // Step 1: Acquire rate limiter permit FIRST without occupying a concurrency slot
    const refundRateToken = await this.rateLimiter.acquire({
      signal: options.signal,
      model: targetModel,
      provider: this.name,
    });

    let isDispatched = false;
    const safeRefund = () => {
      // Guard: Never refund after request has been dispatched upstream to the provider!
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
      // Step 2: Acquire concurrency slot from bounded limiter queue
      releaseConcurrencySlot = await this.limiter.acquire({
        signal: options.signal,
        model: targetModel,
        provider: this.name,
      });
    } catch (concurrencyErr) {
      safeRefund();
      throw concurrencyErr;
    }

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await this.rateLimiter.acquire({
            signal: options.signal,
            model: targetModel,
            provider: this.name,
          });
        }

        try {
          // Mark as dispatched immediately before calling upstream client
          isDispatched = true;

          stream = await client.chat.completions.create(
            {
              model: targetModel,
              messages,
              temperature: options.temperature,
              max_tokens: options.maxTokens,
              stream: true,
              stream_options: {
                include_usage: true,
              },
            },
            {
              signal: options.signal,
            },
          );
          break;
        } catch (streamErr) {
          if (streamErr.name === "AbortError" || options.signal?.aborted) {
            throw streamErr;
          }

          const isTransient = this._isTransientError(streamErr);
          const retryAfterSec = this._extractRetryAfter(streamErr);

          if (retryAfterSec && retryAfterSec > 0) {
            const delayMs = retryAfterSec * 1000;
            this.limiter.pauseFor(delayMs);
            this.rateLimiter.pauseFor(delayMs);
          }

          console.warn("[OPENAI STREAM CONNECT ATTEMPT FAILED]", {
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            isTransient,
            status: streamErr.status,
            code: streamErr.code,
            message: streamErr.message,
            retryAfterSec,
            model: targetModel,
          });

          if (!isTransient || attempt >= maxRetries) {
            if (streamErr instanceof ProviderError) throw streamErr;
            throw new ProviderError(
              `Unable to stream from AI provider (${streamErr.status || streamErr.code || "upstream error"}).`,
              {
                provider: this.name,
                model: targetModel,
                upstreamStatus: streamErr.status,
                isTransient,
                cause: streamErr,
              },
            );
          }

          const baseBackoff = Math.min(2000, 400 * Math.pow(2, attempt));
          const jitter = Math.floor(Math.random() * 200);
          const backoffMs =
            retryAfterSec && retryAfterSec > 0
              ? Math.min(retryAfterSec * 1000, 5000)
              : baseBackoff + jitter;

          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }

      try {
        for await (const chunk of stream) {
          if (options.signal?.aborted) {
            break;
          }

          const content = chunk.choices?.[0]?.delta?.content;

          if (typeof content === "string" && content) {
            yield {
              type: "token",
              content,
            };
          }

          if (chunk.usage) {
            const inputTokens = chunk.usage.prompt_tokens ?? 0;
            const outputTokens = chunk.usage.completion_tokens ?? 0;

            yield {
              type: "usage",
              usage: {
                inputTokens,
                outputTokens,
                totalTokens:
                  chunk.usage.total_tokens ?? inputTokens + outputTokens,
              },
            };
          }
        }
      } catch (iterErr) {
        if (iterErr.name === "AbortError" || options.signal?.aborted) {
          return;
        }
        if (iterErr instanceof ProviderError) {
          throw iterErr;
        }
        throw new ProviderError(
          "Stream connection interrupted by AI provider.",
          {
            provider: this.name,
            model: targetModel,
            upstreamStatus: iterErr.status,
            isTransient: this._isTransientError(iterErr),
            cause: iterErr,
          },
        );
      }
    } finally {
      if (releaseConcurrencySlot) {
        releaseConcurrencySlot();
      }
    }
  }
}
