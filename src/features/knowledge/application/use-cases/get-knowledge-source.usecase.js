import { AppError } from "../../../../common/errors/AppError.js";

export class GetKnowledgeSourceUseCase {
  constructor({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  }) {
    this.knowledgeSourceRepository = knowledgeSourceRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, projectId, knowledgeSourceId }) {
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

    return source;
  }
}
