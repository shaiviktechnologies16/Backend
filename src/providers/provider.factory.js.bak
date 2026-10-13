import { OllamaProvider } from "./ollama/ollama.provider.js";
import { OpenAIProvider } from "./openai/openai.provider.js";
import { AIWorkerPool } from "./router/ai-worker-pool.js";
import { AIInferenceRouter } from "./router/ai-inference-router.js";

export function createAIProviderFactory({
  getPlatformApiKeyValueUseCase,
  getPlatformConfigUseCase,
}) {
  const workerPool = new AIWorkerPool({
    getPlatformConfigUseCase,
  });

  const ollamaProvider = new OllamaProvider({
    getPlatformConfigUseCase,
    workerPool,
  });

  const openAIProvider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase,
  });

  const aiInferenceRouter = new AIInferenceRouter({
    workerPool,
    ollamaProvider,
    openAIProvider,
  });

  const providers = {
    ollama: ollamaProvider,
    openai: openAIProvider,
    router: aiInferenceRouter,
  };

  return {
    async getProvider() {
      const providerName =
        await getPlatformConfigUseCase.getValue("AI_PROVIDER");

      const provider = providers[providerName] ?? null;

      if (!provider) {
        throw new Error(`Unsupported AI provider: ${providerName}`);
      }

      return provider;
    },

    getProviderByName(name) {
      if (!name) {
        return providers.ollama;
      }
      return providers[name] ?? providers.ollama;
    },

    getWorkerPool() {
      return workerPool;
    },

    getRouter() {
      return aiInferenceRouter;
    },
  };
}
