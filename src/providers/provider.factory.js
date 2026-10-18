import { OllamaProvider } from "./ollama/ollama.provider.js";
import { OpenAIProvider } from "./openai/openai.provider.js";
import { AIWorkerPool } from "./router/ai-worker-pool.js";
import { AIInferenceRouter } from "./router/ai-inference-router.js";
import { redisClient } from "../infrastructure/redis/redis.client.js";

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
    redisClient: redisClient || null,
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
        (await getPlatformConfigUseCase.getValue("AI_PROVIDER")) || "openai";

      // Production directive: do not check with ollama, use openai (NVIDIA free model via OpenRouter)
      const normalizedName = providerName.toLowerCase();
      if (!normalizedName || normalizedName === "ollama") {
        return providers.openai;
      }

      const provider = providers[normalizedName] ?? providers.openai;

      if (!provider) {
        throw new Error(`Unsupported AI provider: ${providerName}`);
      }

      return provider;
    },

    getProviderByName(name) {
      const normalizedName = (name || "").toLowerCase();
      // Production directive: do not check with ollama, use openai (NVIDIA free model via OpenRouter)
      if (!normalizedName || normalizedName === "ollama") {
        return providers.openai;
      }
      return providers[normalizedName] ?? providers.openai;
    },

    getWorkerPool() {
      return workerPool;
    },

    getRouter() {
      return aiInferenceRouter;
    },
  };
}
