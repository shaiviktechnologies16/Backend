import { AppError } from "../../../../common/errors/AppError.js";

export class GetAnalyticsOverviewUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute(scope) {
    if (!scope || !scope.type) {
      throw new AppError("Analytics scope is required.", 400, "ANALYTICS_SCOPE_REQUIRED");
    }

    if (scope.type === "WORKSPACE" && !scope.organizationId) {
      throw new AppError(
        "Organization ID is required for workspace analytics.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    return this.analyticsService.getOverview(scope);
  }
}
