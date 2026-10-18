import { AppError } from "../../../../common/errors/AppError.js";

export class GetProjectVisitorDetailsUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, visitorId }) {
    if (!visitorId) {
      throw new AppError("Visitor ID is required.", 400, "VISITOR_ID_REQUIRED");
    }

    const visitor = await this.projectAnalyticsRepository.getVisitorDetails(
      projectId,
      visitorId,
    );

    if (!visitor) {
      throw new AppError("Visitor not found.", 404, "VISITOR_NOT_FOUND");
    }

    return visitor;
  }
}

