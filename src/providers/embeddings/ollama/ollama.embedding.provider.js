import { EmbeddingProvider } from "../embedding.provider.js";
import { ProviderError } from "../../../common/errors/ProviderError.js";

export class OllamaEmbeddingProvider extends EmbeddingProvider {
  constructor({ getPlatformConfigUseCase }) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  async embed(texts, { model } = {}) {
    if (!model) {
      throw new ProviderError("Embedding model is required.");
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    try {
      const baseUrl =
        await this.getPlatformConfigUseCase.getValue("OLLAMA_BASE_URL");

      if (!baseUrl) {
        throw new ProviderError("Ollama base URL is not configured.");
      }

      const embeddings = [];

      for (const text of texts) {
        const response = await fetch(`${baseUrl}/api/embed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input: text,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.error("[OLLAMA EMBED FAILED]", {
            status: response.status,
            error: errText,
            model,
          });
          throw new ProviderError(
            `Ollama embedding server error (status ${response.status}): ${errText}`,
          );
        }

        const data = await response.json();

        if (!data.embeddings?.[0]) {
          throw new ProviderError(
            "Ollama returned an invalid embedding response.",
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
        cause: error,
      });
    }
  }
}
