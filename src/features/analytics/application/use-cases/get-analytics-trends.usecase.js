import { AppError } from "../../../../common/errors/AppError.js";

export class GetAnalyticsTrendsUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute({ scope, from, to, interval = "day" } = {}) {
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

    return this.analyticsService.getTrends(scope, {
      from,
      to,
      interval,
    });
  }
}
