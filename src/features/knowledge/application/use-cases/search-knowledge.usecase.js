import { AppError } from "../../../../common/errors/AppError.js";

export class SearchKnowledgeUseCase {
  constructor({ knowledgeSearchService, checkProjectAccessUseCase }) {
    this.knowledgeSearchService = knowledgeSearchService;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, projectId, query, limit }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    if (!query?.trim()) {
      throw new AppError(
        "Search query is required.",
        400,
        "SEARCH_QUERY_REQUIRED",
      );
    }

    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 1) {
        throw new AppError(
          "Search limit must be a positive integer.",
          400,
          "INVALID_SEARCH_LIMIT",
        );
      }
    }

    return await this.knowledgeSearchService.search({
      projectId,
      query,
      limit,
    });
  }
}
