import { AIProvider } from "../interfaces/ai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";

export class OllamaProvider extends AIProvider {
  constructor({ getPlatformConfigUseCase }) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.configCache = null;
    this.configCacheExpiresAt = 0;
  }

  get name() {
    return "ollama";
  }

  async getConfig() {
    if (this.configCache && Date.now() < this.configCacheExpiresAt) {
      return this.configCache;
    }

    const [baseUrl, model, think] = await Promise.all([
      this.getPlatformConfigUseCase.getValue("OLLAMA_BASE_URL"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_MODEL"),
      this.getPlatformConfigUseCase.getValue("OLLAMA_THINK"),
    ]);

    this.configCache = {
      baseUrl: baseUrl || "http://127.0.0.1:11434",
      model: model || "qwen3:8b",
      think: think === "true",
    };

    this.configCacheExpiresAt = Date.now() + 60_000;

    console.log("[OLLAMA CONFIG RUNTIME]", {
      baseUrl,
      model,
      think,
      hasApiKey: false,
    });

    return this.configCache;
  }

  async chat(
    messages,
    { model, temperature = 0.7, maxTokens = 2048, tools = [] } = {},
  ) {
    try {
      const config = await this.getConfig();

      const body = {
        model: model ?? config.model,
        think: config.think,
        stream: false,
        keep_alive: -1,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        messages,
      };

      if (tools.length > 0) {
        body.tools = tools;
      }

      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new ProviderError(
          `Internal Server error status ${response.status}: ${errorText}`,
        );
      }

      const result = await response.json();

      return result;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to connect to Ollama server.", {
        cause: error,
      });
    }
  }

  async *stream(
    messages,
    { model, temperature = 0.7, maxTokens = 2048, tools = [] } = {},
  ) {
    try {
      const config = await this.getConfig();

      const body = {
        model: model ?? config.model,
        think: config.think,
        stream: true,
        keep_alive: -1,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        messages,
      };

      if (tools.length > 0) {
        body.tools = tools;
      }

      const requestStartedAt = Date.now();
      const promptCharacters = messages.reduce(
        (total, message) => total + (message.content?.length ?? 0),
        0,
      );

      console.log("[OLLAMA STREAM REQUEST]", {
        baseUrl: config.baseUrl,
        model: body.model,
        think: body.think,
        temperature: body.options.temperature,
        maxTokens: body.options.num_predict,
        messageCount: messages.length,
        promptCharacters,
        toolCount: tools.length,
        messageDetails: messages.map((message) => ({
          role: message.role,
          characters: message.content?.length ?? 0,
        })),
      });

      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log("[OLLAMA STREAM RESPONSE]", {
        status: response.status,
        timeToResponseMs: Date.now() - requestStartedAt,
      });

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
            console.log("[OLLAMA STREAM COMPLETE]", {
              totalDurationMs: Date.now() - requestStartedAt,
              inputTokens: json.prompt_eval_count ?? 0,
              outputTokens: json.eval_count ?? 0,
              promptEvalDurationMs: Math.round(
                (json.prompt_eval_duration ?? 0) / 1_000_000,
              ),
              evalDurationMs: Math.round((json.eval_duration ?? 0) / 1_000_000),
              timeToFirstTokenMs: firstTokenAt
                ? firstTokenAt - requestStartedAt
                : null,
            });

            yield {
              type: "timing",
              timing: {
                ollamaTtfbMs: firstTokenAt
                  ? firstTokenAt - requestStartedAt
                  : null,
                ollamaTotalMs: Date.now() - requestStartedAt,
              },
            };

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

          const token = message?.content;

          if (token) {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();

              console.log("[OLLAMA FIRST TOKEN]", {
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
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to stream from Ollama server.", {
        cause: error,
      });
    }
  }

  async healthCheck() {
    try {
      const config = await this.getConfig();

      const response = await fetch(`${config.baseUrl}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        return "Unhealthy";
      }

      return "Healthy";
    } catch {
      return "Unhealthy";
    }
  }
}
