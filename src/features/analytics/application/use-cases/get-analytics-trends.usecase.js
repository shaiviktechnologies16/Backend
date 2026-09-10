export class GetAnalyticsTrendsUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute({ scope, from, to, interval = "day" } = {}) {
    if (!scope || !scope.type) {
      throw new Error("Analytics scope is required.");
    }

    if (scope.type === "WORKSPACE" && !scope.organizationId) {
      throw new Error("Organization ID is required for workspace analytics.");
    }

    return this.analyticsService.getTrends(scope, {
      from,
      to,
      interval,
    });
  }
}
