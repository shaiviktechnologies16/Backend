import { OllamaEmbeddingProvider } from "./ollama/ollama.embedding.provider.js";

export function createEmbeddingProviderFactory({ getPlatformConfigUseCase }) {
  const providers = {
    ollama: new OllamaEmbeddingProvider({
      getPlatformConfigUseCase,
    }),
  };

  return {
    getProvider(providerName) {
      const provider = providers[providerName];

      if (!provider) {
        throw new Error(`Unsupported embedding provider: ${providerName}`);
      }

      return provider;
    },
  };
}
