import { AppError } from "../../../../common/errors/AppError.js";
import { KnowledgeSource } from "../../domain/entities/knowledge-source.entity.js";

export class CreateKnowledgeSourceUseCase {
  constructor({ knowledgeSourceRepository, checkProjectAccessUseCase }) {
    this.knowledgeSourceRepository = knowledgeSourceRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({
    userId,
    projectId,
    name,
    type,
    sourceUrl = null,
    filePath = null,
    content = null,
    metadata = null,
  }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    if (!name?.trim()) {
      throw new AppError(
        "Knowledge source name is required.",
        400,
        "KNOWLEDGE_SOURCE_NAME_REQUIRED",
      );
    }

    if (!type?.trim()) {
      throw new AppError(
        "Knowledge source type is required.",
        400,
        "KNOWLEDGE_SOURCE_TYPE_REQUIRED",
      );
    }

    const source = new KnowledgeSource({
      projectId,
      name: name.trim(),
      type: type.trim(),
      sourceUrl,
      filePath,
      content,
      metadata,
    });

    return this.knowledgeSourceRepository.create(source);
  }
}
