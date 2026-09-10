import { AppError } from "../../../../common/errors/AppError.js";
import { executeTransaction } from "../../../../database/transaction.js";

export class IngestKnowledgeSourceUseCase {
  constructor({
    knowledgeSourceRepository,
    knowledgeChunkRepository,
    textChunkingService,
    checkProjectAccessUseCase,
    aiModelRepository,
    embeddingProviderFactory,
  }) {
    this.knowledgeSourceRepository = knowledgeSourceRepository;
    this.knowledgeChunkRepository = knowledgeChunkRepository;
    this.textChunkingService = textChunkingService;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
    this.aiModelRepository = aiModelRepository;
    this.embeddingProviderFactory = embeddingProviderFactory;
  }

  async execute({ userId, projectId, knowledgeSourceId }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    const source =
      await this.knowledgeSourceRepository.findById(knowledgeSourceId);

    if (!source) {
      throw new AppError(
        "Knowledge source not found.",
        404,
        "KNOWLEDGE_SOURCE_NOT_FOUND",
      );
    }

    if (source.projectId !== projectId) {
      throw new AppError(
        "Knowledge source does not belong to this project.",
        403,
        "KNOWLEDGE_SOURCE_PROJECT_MISMATCH",
      );
    }

    if (!source.content?.trim()) {
      throw new AppError(
        "Knowledge source has no content to ingest.",
        400,
        "KNOWLEDGE_SOURCE_CONTENT_EMPTY",
      );
    }

    const embeddingModels = await this.aiModelRepository.findAll();

    const embeddingModel = embeddingModels.find(
      (model) => model.capability === "EMBEDDING" && model.status === "ACTIVE",
    );

    if (!embeddingModel) {
      throw new AppError(
        "No active embedding model is configured.",
        503,
        "EMBEDDING_MODEL_NOT_CONFIGURED",
      );
    }

    const embeddingProvider = this.embeddingProviderFactory.getProvider(
      embeddingModel.provider,
    );

    source.status = "PROCESSING";

    await this.knowledgeSourceRepository.update(source);

    try {
      const chunks = this.textChunkingService.chunk(source.content);

      const embeddings = await embeddingProvider.embed(
        chunks.map((chunk) => chunk.content),
        {
          model: embeddingModel.model,
        },
      );

      if (embeddings.length !== chunks.length) {
        throw new AppError(
          "Embedding count does not match chunk count.",
          500,
          "EMBEDDING_COUNT_MISMATCH",
        );
      }

      const chunkEntities = chunks.map((chunk, index) => ({
        knowledgeSourceId: source.id,
        projectId: source.projectId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: {
          sourceType: source.type,
          embeddingModelId: embeddingModel.id,
        },
        embedding: embeddings[index],
      }));

      const result = await executeTransaction(async (queryRunner) => {
        const manager = queryRunner.manager;

        await this.knowledgeChunkRepository.deleteByKnowledgeSourceId(
          source.id,
          manager,
        );

        await this.knowledgeChunkRepository.createMany(chunkEntities, manager);

        source.status = "READY";

        return await this.knowledgeSourceRepository.update(source, manager);
      });

      return result;
    } catch (error) {
      source.status = "FAILED";

      await this.knowledgeSourceRepository.update(source);

      throw error;
    }
  }
}
