import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";
import { AIWorkerPool } from "../router/ai-worker-pool.js";

export class OllamaProvider extends AIProvider {
  constructor({ getPlatformConfigUseCase, workerPool = null, defaultModel = "qwen3:8b" } = {}) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.workerPool =
      workerPool || new AIWorkerPool({ getPlatformConfigUseCase });
    this.defaultModel = defaultModel || "qwen3:8b";
    this.configCache = null;
    this.configCacheExpiresAt = 0;
  }

  get name() {
    return "ollama";
  }

  get model() {
    return this.defaultModel;
  }

  async getConfig() {
    if (this.configCache && Date.now() < this.configCacheExpiresAt) {
      return this.configCache;
    }

    const [baseUrl, model, think, apiKey] = await Promise.all([
      this.getPlatformConfigUseCase.getValue("OLLAMA_BASE_URL"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_MODEL"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_THINK"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_API_KEY"),
    ]);

    this.configCache = {
      baseUrl: baseUrl || "http://127.0.0.1:11434",
      model: model || "qwen3:8b",
      think: think === "true",
      apiKey: apiKey || null,
    };

    this.defaultModel = this.configCache.model;
    this.configCacheExpiresAt = Date.now() + 60_000;

    console.log("[OLLAMA CONFIG RUNTIME]", {
      baseUrl: this.configCache.baseUrl,
      model: this.configCache.model,
      think: this.configCache.think,
      hasApiKey: !!this.configCache.apiKey,
    });

    return this.configCache;
  }

  _getHeaders(config) {
    const headers = {
      "Content-Type": "application/json",
    };
    if (config?.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      headers["x-api-key"] = config.apiKey;
    }
    return headers;
  }

  async chat(
    messages,
    { model, temperature = 0.7, maxTokens = 2048, tools = [], timeout = null } = {},
  ) {
    let selectedWorker = null;
    let timeoutId = null;
    let controller = null;

    if (timeout && Number(timeout) > 0) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        const timeoutErr = new ProviderError(
          `AI_DIRECTOR_TIMEOUT: Ollama request timed out after ${timeout}ms`,
        );
        timeoutErr.code = "AI_DIRECTOR_TIMEOUT";
        controller.abort(timeoutErr);
      }, Number(timeout));
    }

    try {
      const config = await this.getConfig();
      const targetModel = model ?? config.model;

      selectedWorker = await this.workerPool.selectWorker({
        provider: "ollama",
        model: targetModel,
      });

      selectedWorker.activeRequests = Math.max(
        0,
        (selectedWorker.activeRequests || 0) + 1,
      );

      const body = {
        model: targetModel,
        think: config.think,
        stream: false,
        keep_alive: -1,
        options: {
          temperature,
          num_predict: maxTokens,
          num_ctx: 4096,
        },
        messages,
      };

      if (tools.length > 0) {
        body.tools = tools;
      }

      let response;
      try {
        response = await fetch(`${selectedWorker.baseUrl}/api/chat`, {
          method: "POST",
          headers: this._getHeaders(config),
          body: JSON.stringify(body),
          signal: controller?.signal,
        });
      } catch (fetchErr) {
        if (
          fetchErr.name === "AbortError" ||
          fetchErr.code === "AI_DIRECTOR_TIMEOUT" ||
          controller?.signal?.aborted
        ) {
          const timeoutErr = new ProviderError(
            `AI_DIRECTOR_TIMEOUT: Ollama request timed out after ${timeout}ms`,
          );
          timeoutErr.code = "AI_DIRECTOR_TIMEOUT";
          throw timeoutErr;
        }

        selectedWorker.healthStatus = "UNHEALTHY";
        console.warn(
          "[AI WORKER FETCH ERROR]",
          `Worker ${selectedWorker.id} (${selectedWorker.baseUrl}) failed. Retrying worker selection.`,
          fetchErr,
        );

        selectedWorker.activeRequests = Math.max(
          0,
          selectedWorker.activeRequests - 1,
        );
        selectedWorker = await this.workerPool.selectWorker({
          provider: "ollama",
          model: targetModel,
        });

        selectedWorker.activeRequests = Math.max(
          0,
          (selectedWorker.activeRequests || 0) + 1,
        );

        response = await fetch(`${selectedWorker.baseUrl}/api/chat`, {
          method: "POST",
          headers: this._getHeaders(config),
          body: JSON.stringify(body),
          signal: controller?.signal,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();

        const err = new ProviderError(
          `Internal Server error status ${response.status}: ${errorText}`,
        );
        err.code = "AI_DIRECTOR_PROVIDER_UNAVAILABLE";
        throw err;
      }

      const result = await response.json();

      return result;
    } catch (error) {
      if (
        error.name === "AbortError" ||
        error.code === "AI_DIRECTOR_TIMEOUT" ||
        controller?.signal?.aborted
      ) {
        const timeoutErr = new ProviderError(
          `AI_DIRECTOR_TIMEOUT: Ollama request timed out after ${timeout}ms`,
        );
        timeoutErr.code = "AI_DIRECTOR_TIMEOUT";
        throw timeoutErr;
      }

      if (error instanceof ProviderError) {
        throw error;
      }

      const err = new ProviderError("Unable to connect to Ollama server.", {
        cause: error,
      });
      err.code = "AI_DIRECTOR_PROVIDER_UNAVAILABLE";
      throw err;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (selectedWorker) {
        selectedWorker.activeRequests = Math.max(
          0,
          selectedWorker.activeRequests - 1,
        );
      }
    }
  }

  async *stream(
    messages,
    { model, temperature = 0.7, maxTokens = 2048, tools = [], signal } = {},
  ) {
    let selectedWorker = null;
    let workerSelectionDurationMs = 0;

    try {
      const config = await this.getConfig();
      const targetModel = model ?? config.model;

      const selectionStartedAt = Date.now();
      selectedWorker = await this.workerPool.selectWorker({
        provider: "ollama",
        model: targetModel,
      });
      workerSelectionDurationMs = Date.now() - selectionStartedAt;

      selectedWorker.activeRequests = Math.max(
        0,
        (selectedWorker.activeRequests || 0) + 1,
      );

      const body = {
        model: targetModel,
        think: config.think,
        stream: true,
        keep_alive: -1,
        options: {
          temperature,
          num_predict: maxTokens,
          num_ctx: 2048,
        },
        messages,
      };

      if (tools && tools.length > 0) {
        body.tools = tools;
      }

      const requestStartedAt = Date.now();
      const promptCharacters = messages.reduce(
        (total, message) => total + (message.content?.length ?? 0),
        0,
      );

      console.log("[PublicChatDebug] OLLAMA_REQUEST_START", {
        model: body.model,
      });

      console.log("[OLLAMA STREAM REQUEST]", {
        workerId: selectedWorker.id,
        baseUrl: selectedWorker.baseUrl,
        model: body.model,
        think: body.think,
        temperature: body.options.temperature,
        maxTokens: body.options.num_predict,
        messageCount: messages.length,
        promptCharacters,
        toolCount: tools?.length ?? 0,
        concurrencyAtRequest: selectedWorker.activeRequests,
        workerSelectionDurationMs,
      });

      let response;
      try {
        response = await fetch(`${selectedWorker.baseUrl}/api/chat`, {
          method: "POST",
          headers: this._getHeaders(config),
          body: JSON.stringify(body),
          signal,
        });
      } catch (fetchErr) {
        if (fetchErr.name === "AbortError") {
          throw fetchErr;
        }

        selectedWorker.healthStatus = "UNHEALTHY";
        console.warn(
          "[AI WORKER FETCH ERROR]",
          `Worker ${selectedWorker.id} (${selectedWorker.baseUrl}) failed. Retrying worker selection.`,
          fetchErr,
        );

        selectedWorker.activeRequests = Math.max(
          0,
          selectedWorker.activeRequests - 1,
        );
        selectedWorker = await this.workerPool.selectWorker({
          provider: "ollama",
          model: targetModel,
        });

        selectedWorker.activeRequests = Math.max(
          0,
          (selectedWorker.activeRequests || 0) + 1,
        );

        response = await fetch(`${selectedWorker.baseUrl}/api/chat`, {
          method: "POST",
          headers: this._getHeaders(config),
          body: JSON.stringify(body),
          signal,
        });
      }

      console.log("[PublicChatDebug] OLLAMA_REQUEST_CONNECTED");

      console.log("[OLLAMA STREAM RESPONSE]", {
        status: response.status,
        timeToResponseMs: Date.now() - requestStartedAt,
        workerId: selectedWorker.id,
        concurrencyAtRequest: selectedWorker.activeRequests,
      });

      if (!response.ok && targetModel !== config.model) {
        console.warn(
          `[OLLAMA MODEL FALLBACK] Model "${targetModel}" failed with status ${response.status}. Retrying with default model "${config.model}".`,
        );
        body.model = config.model;
        response = await fetch(`${selectedWorker.baseUrl}/api/chat`, {
          method: "POST",
          headers: this._getHeaders(config),
          body: JSON.stringify(body),
          signal,
        });
      }

      if (!response.ok) {
        throw new ProviderError(
          `Internal Server error status ${response.status}`,
        );
      }

      if (!response.body) {
        throw new ProviderError("Ollama response body is empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let firstTokenAt = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const json = JSON.parse(line);

          if (json.done) {
            const promptEvalDurationMs = Math.round(
              (json.prompt_eval_duration ?? 0) / 1_000_000,
            );
            const evalDurationMs = Math.round(
              (json.eval_duration ?? 0) / 1_000_000,
            );
            const evalCount = json.eval_count ?? 0;
            const tokensPerSec =
              evalDurationMs > 0
                ? Number(((evalCount / evalDurationMs) * 1000).toFixed(2))
                : 0;

            const ttftMs = firstTokenAt
              ? firstTokenAt - requestStartedAt
              : Date.now() - requestStartedAt;
            const queueWaitMs = Math.max(0, ttftMs - promptEvalDurationMs);

            console.log("[AI Performance]", {
              workerId: selectedWorker.id,
              workerHealth: selectedWorker.healthStatus,
              workerActiveRequests: selectedWorker.activeRequests,
              workerSelectionDurationMs,
              concurrencyAtRequest: selectedWorker.activeRequests,
              queueWaitMs,
              timeToFirstTokenMs: ttftMs,
              promptEvalDurationMs,
              evalDurationMs,
              tokensPerSec,
              inputTokens: json.prompt_eval_count ?? 0,
              outputTokens: evalCount,
              totalDurationMs: Date.now() - requestStartedAt,
            });

            console.log("[OLLAMA STREAM COMPLETE]", {
              workerId: selectedWorker.id,
              totalDurationMs: Date.now() - requestStartedAt,
              inputTokens: json.prompt_eval_count ?? 0,
              outputTokens: evalCount,
              promptEvalDurationMs,
              evalDurationMs,
              tokensPerSec,
              timeToFirstTokenMs: firstTokenAt
                ? firstTokenAt - requestStartedAt
                : null,
            });

            yield {
              type: "timing",
              timing: {
                workerId: selectedWorker.id,
                workerHealth: selectedWorker.healthStatus,
                workerActiveRequests: selectedWorker.activeRequests,
                workerSelectionDurationMs,
                ollamaTtfbMs: firstTokenAt
                  ? firstTokenAt - requestStartedAt
                  : null,
                ollamaTotalMs: Date.now() - requestStartedAt,
                promptEvalDurationMs,
                evalDurationMs,
                tokensPerSec,
                concurrencyAtRequest: selectedWorker.activeRequests,
                queueWaitMs,
              },
            };

            const inputTokens = json.prompt_eval_count ?? 0;
            const outputTokens = evalCount;

            yield {
              type: "usage",
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
              },
            };

            return;
          }

          const message = json.message;

          if (message?.tool_calls?.length) {
            yield {
              type: "tool_calls",
              toolCalls: message.tool_calls,
            };

            continue;
          }

          const token = message?.content || message?.thinking;

          if (token) {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();

              console.log("[OLLAMA FIRST TOKEN]", {
                workerId: selectedWorker.id,
                timeToFirstTokenMs: firstTokenAt - requestStartedAt,
              });

              console.log("[PublicChatDebug] OLLAMA_FIRST_TOKEN", {
                workerId: selectedWorker.id,
                timeToFirstTokenMs: firstTokenAt - requestStartedAt,
              });
            }

            yield {
              type: "token",
              content: token,
            };
          }
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.done) {
            const inputTokens = json.prompt_eval_count ?? 0;
            const outputTokens = json.eval_count ?? 0;
            yield {
              type: "usage",
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
              },
            };
          } else {
            const token = json.message?.content || json.message?.thinking;
            if (token) {
              yield {
                type: "token",
                content: token,
              };
            }
          }
        } catch {
          // ignore incomplete trailing buffer
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log(
          "[OLLAMA STREAM ABORTED]",
          `Client disconnected stream on worker ${selectedWorker?.id}.`,
        );
        return;
      }

      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to stream from Ollama server.", {
        cause: error,
      });
    } finally {
      if (selectedWorker) {
        selectedWorker.activeRequests = Math.max(
          0,
          selectedWorker.activeRequests - 1,
        );
      }
    }
  }

  async healthCheck() {
    try {
      const worker = await this.workerPool.selectWorker({
        provider: "ollama",
      });
      return worker && worker.healthStatus === "HEALTHY"
        ? "Healthy"
        : "Unhealthy";
    } catch {
      return "Unhealthy";
    }
  }
}
