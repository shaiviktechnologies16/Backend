import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateKnowledgeSourceUseCase {
  constructor({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  }) {
    this.knowledgeSourceRepository = knowledgeSourceRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({
    userId,
    projectId,
    knowledgeSourceId,
    name,
    type,
    sourceUrl,
    filePath,
    content,
    status,
    metadata,
  }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    const source = await this.knowledgeSourceRepository.findById(
      knowledgeSourceId,
    );

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

    if (name !== undefined) {
      if (!name?.trim()) {
        throw new AppError(
          "Knowledge source name cannot be empty.",
          400,
          "KNOWLEDGE_SOURCE_NAME_INVALID",
        );
      }

      source.name = name.trim();
    }

    if (type !== undefined) {
      if (!type?.trim()) {
        throw new AppError(
          "Knowledge source type cannot be empty.",
          400,
          "KNOWLEDGE_SOURCE_TYPE_INVALID",
        );
      }

      source.type = type.trim();
    }

    if (sourceUrl !== undefined) {
      source.sourceUrl = sourceUrl;
    }

    if (filePath !== undefined) {
      source.filePath = filePath;
    }

    if (content !== undefined) {
      source.content = content;
    }

    if (status !== undefined) {
      source.status = status;
    }

    if (metadata !== undefined) {
      source.metadata = metadata;
    }

    return this.knowledgeSourceRepository.update(source);
  }
}
