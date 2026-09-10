export class GetAnalyticsAgentsUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute({ scope, from, to, limit = 10 } = {}) {
    if (!scope || !scope.type) {
      throw new Error("Analytics scope is required.");
    }

    if (scope.type === "WORKSPACE" && !scope.organizationId) {
      throw new Error("Organization ID is required for workspace analytics.");
    }

    return this.analyticsService.getAgentUsage(scope, {
      from,
      to,
      limit,
    });
  }
}
