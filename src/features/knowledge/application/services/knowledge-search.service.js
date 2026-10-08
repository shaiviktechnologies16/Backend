import { AppError } from "../../../../common/errors/AppError.js";

export class KnowledgeSearchService {
  constructor({
    knowledgeChunkRepository,
    aiModelRepository,
    getPlatformConfigUseCase,
    embeddingProviderFactory,
  }) {
    this.knowledgeChunkRepository = knowledgeChunkRepository;
    this.aiModelRepository = aiModelRepository;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.embeddingProviderFactory = embeddingProviderFactory;
  }

  async search({ projectId, query, limit }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    if (!query?.trim()) {
      throw new AppError(
        "Search query is required.",
        400,
        "SEARCH_QUERY_REQUIRED",
      );
    }

    const configuredTopK = Number(
      await this.getPlatformConfigUseCase.getValue("AI_RAG_TOP_K"),
    );

    const configuredSimilarityThreshold = Number(
      await this.getPlatformConfigUseCase.getValue(
        "AI_RAG_SIMILARITY_THRESHOLD",
      ),
    );

    const topK = Number.isFinite(configuredTopK) ? configuredTopK : 5;

    const similarityThreshold = Number.isFinite(configuredSimilarityThreshold)
      ? Math.min(configuredSimilarityThreshold, 0.5)
      : 0.3;

    const models = await this.aiModelRepository.findAll();

    const embeddingModel = models.find(
      (model) => model.capability === "EMBEDDING" && model.status === "ACTIVE",
    );

    if (!embeddingModel) {
      throw new AppError(
        "No active embedding model is configured.",
        503,
        "EMBEDDING_MODEL_NOT_CONFIGURED",
      );
    }

    const provider = this.embeddingProviderFactory.getProvider(
      embeddingModel.provider,
    );

    const embeddingStartedAt = Date.now();

    const [queryEmbedding] = await provider.embed([query.trim()], {
      model: embeddingModel.model,
    });

    console.log("[RAG EMBEDDING]", {
      durationMs: Date.now() - embeddingStartedAt,
      model: embeddingModel.model,
    });

    if (!queryEmbedding) {
      throw new AppError(
        "Unable to generate query embedding.",
        500,
        "QUERY_EMBEDDING_FAILED",
      );
    }

    const searchStartedAt = Date.now();

    let results = [];
    if (typeof this.knowledgeChunkRepository.searchHybrid === "function") {
      results = await this.knowledgeChunkRepository.searchHybrid({
        projectId,
        embedding: queryEmbedding,
        query: query.trim(),
        limit: limit ?? topK,
        similarityThreshold,
      });
    } else {
      results = await this.knowledgeChunkRepository.searchSimilar({
        projectId,
        embedding: queryEmbedding,
        limit: limit ?? topK,
        similarityThreshold,
      });
    }

    if (!results || results.length === 0) {
      results = await this.knowledgeChunkRepository.searchSimilar({
        projectId,
        embedding: queryEmbedding,
        limit: limit ?? topK,
        similarityThreshold: 0.1,
      });
    }

    console.log("[RAG HYBRID SEARCH]", {
      durationMs: Date.now() - searchStartedAt,
      resultCount: results.length,
      limit: limit ?? topK,
      similarityThreshold,
    });

    return results;
  }
}
