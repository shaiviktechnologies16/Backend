import { OllamaProvider } from "./ollama/ollama.provider.js";
import { OpenAIProvider } from "./openai/openai.provider.js";

export function createAIProviderFactory({
  getPlatformApiKeyValueUseCase,
  getPlatformConfigUseCase,
}) {
  const providers = {
    ollama: new OllamaProvider({
      getPlatformConfigUseCase,
    }),

    openai: new OpenAIProvider({
      getPlatformApiKeyValueUseCase,
    }),
  };

  return {
    async getProvider() {
      const providerName =
        await getPlatformConfigUseCase.getValue("AI_PROVIDER");

      const provider = providers[providerName];

      if (!provider) {
        throw new Error(`Unsupported AI provider: ${providerName}`);
      }

      return provider;
    },

    getProviderByName(name) {
      return providers[name] ?? null;
    },
  };
}
