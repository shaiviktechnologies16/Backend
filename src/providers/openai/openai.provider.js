import OpenAI from "openai";
import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";

export class OpenAIProvider extends AIProvider {
  constructor({ getPlatformApiKeyValueUseCase }) {
    super();

    this.getPlatformApiKeyValueUseCase = getPlatformApiKeyValueUseCase;
  }

  get name() {
    return "openai";
  }

  get model() {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  get maxContextMessages() {
    return 30;
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

  _isTransientError(error) {
    if (!error) return false;
    if (error.name === "AbortError" || error.code === "ABORT_ERR") return false;
    const status = error.status || error.statusCode;
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

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await client.chat.completions.create({
          model: targetModel,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        });
      } catch (error) {
        if (error.name === "AbortError" || options.signal?.aborted) {
          throw error;
        }

        const isTransient = this._isTransientError(error);
        console.warn("[OPENAI CHAT ATTEMPT FAILED]", {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          isTransient,
          status: error.status,
          code: error.code,
          message: error.message,
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

        const backoffMs = (attempt + 1) * 350;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
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

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        stream = await client.chat.completions.create({
          model: targetModel,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          stream: true,
          stream_options: {
            include_usage: true,
          },
        });
        break;
      } catch (streamErr) {
        if (streamErr.name === "AbortError" || options.signal?.aborted) {
          throw streamErr;
        }

        const isTransient = this._isTransientError(streamErr);
        console.warn("[OPENAI STREAM CONNECT ATTEMPT FAILED]", {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          isTransient,
          status: streamErr.status,
          code: streamErr.code,
          message: streamErr.message,
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

        const backoffMs = (attempt + 1) * 350;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    try {
      for await (const chunk of stream) {
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
  }
}
