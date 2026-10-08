import { AIProvider } from "../interfaces/ai.provider.js";

export class AIInferenceRouter extends AIProvider {
  constructor({ workerPool, ollamaProvider, openAIProvider }) {
    super();
    this.workerPool = workerPool;
    this.ollamaProvider = ollamaProvider;
    this.openAIProvider = openAIProvider;
  }

  get name() {
    return "router";
  }

  get model() {
    return this.ollamaProvider?.model || "qwen3:8b";
  }

  get maxContextMessages() {
    return 30;
  }

  async selectWorker({ provider = "ollama", model }) {
    return await this.workerPool.selectWorker({ provider, model });
  }

  async chat(messages, options = {}) {
    const providerName = options.provider || "ollama";

    if (providerName === "openai") {
      return await this.openAIProvider.chat(messages, options);
    }

    return await this.ollamaProvider.chat(messages, options);
  }

  async *stream(messages, options = {}) {
    const providerName = options.provider || "ollama";

    if (providerName === "openai") {
      yield* this.openAIProvider.stream(messages, options);
      return;
    }

    yield* this.ollamaProvider.stream(messages, options);
  }

  async healthCheck() {
    try {
      const worker = await this.workerPool.selectWorker({ provider: "ollama" });
      return worker && worker.healthStatus === "HEALTHY"
        ? "Healthy"
        : "Unhealthy";
    } catch {
      return "Unhealthy";
    }
  }
}
