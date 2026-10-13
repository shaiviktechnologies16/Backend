import { EmbeddingProvider } from "../embedding.provider.js";
import { ProviderError } from "../../../common/errors/ProviderError.js";

export class OllamaEmbeddingProvider extends EmbeddingProvider {
  constructor({ getPlatformConfigUseCase }) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  _isTransientStatus(status) {
    return (
      status === 502 ||
      status === 503 ||
      status === 504 ||
      status === 429 ||
      (typeof status === "number" && status >= 520)
    );
  }

  async embed(texts, { model } = {}) {
    if (!model) {
      throw new ProviderError("Embedding model is required.", {
        provider: "ollama",
      });
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    try {
      const baseUrl =
        await this.getPlatformConfigUseCase.getValue("OLLAMA_BASE_URL");

      if (!baseUrl) {
        throw new ProviderError("Ollama base URL is not configured.", {
          provider: "ollama",
          model,
        });
      }

      const embeddings = [];
      const maxRetries = 2;

      for (const text of texts) {
        let response = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            response = await fetch(`${baseUrl}/api/embed`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                input: text,
              }),
            });

            if (response.ok) {
              break;
            }

            const status = response.status;
            const isTransient = this._isTransientStatus(status);
            const errText = await response.text().catch(() => "");

            console.warn("[OLLAMA EMBED ATTEMPT FAILED]", {
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              status,
              isTransient,
              model,
            });

            if (!isTransient || attempt >= maxRetries) {
              throw new ProviderError(
                `Ollama embedding server error (status ${status}).`,
                {
                  provider: "ollama",
                  model,
                  upstreamStatus: status,
                  isTransient,
                  cause: new Error(errText || `HTTP ${status}`),
                },
              );
            }

            await new Promise((resolve) =>
              setTimeout(resolve, (attempt + 1) * 300),
            );
          } catch (fetchErr) {
            if (fetchErr instanceof ProviderError) {
              throw fetchErr;
            }

            console.warn("[OLLAMA EMBED FETCH ERROR]", {
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              error: fetchErr.message,
              model,
            });

            if (attempt >= maxRetries) {
              throw new ProviderError("Unable to connect to Ollama embedding service.", {
                provider: "ollama",
                model,
                isTransient: true,
                cause: fetchErr,
              });
            }

            await new Promise((resolve) =>
              setTimeout(resolve, (attempt + 1) * 300),
            );
          }
        }

        const data = await response.json();

        if (!data.embeddings?.[0]) {
          throw new ProviderError(
            "Ollama returned an invalid embedding response.",
            {
              provider: "ollama",
              model,
            },
          );
        }

        embeddings.push(data.embeddings[0]);
      }

      return embeddings;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError("Unable to generate AI embeddings.", {
        provider: "ollama",
        model,
        cause: error,
      });
    }
  }
}
