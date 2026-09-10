export class GetAnalyticsOverviewUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute(scope) {
    if (!scope || !scope.type) {
      throw new Error("Analytics scope is required.");
    }

    if (scope.type === "WORKSPACE" && !scope.organizationId) {
      throw new Error("Organization ID is required for workspace analytics.");
    }

    return this.analyticsService.getOverview(scope);
  }
}
