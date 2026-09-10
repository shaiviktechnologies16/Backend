export class GetWorkspaceAnalyticsUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute({
    organizationId,
    from,
    to,
    interval = "day",
    limit = 10,
  } = {}) {
    if (!organizationId) {
      throw new Error("Organization ID is required.");
    }

    const scope = {
      type: "WORKSPACE",
      organizationId,
    };

    const [overview, trends, agentUsage, projectActivity] = await Promise.all([
      this.analyticsService.getOverview(scope),

      this.analyticsService.getTrends(scope, {
        from,
        to,
        interval,
      }),

      this.analyticsService.getAgentUsage(scope, {
        from,
        to,
        limit,
      }),

      this.analyticsService.getProjectActivity(scope, {
        from,
        to,
        limit,
      }),
    ]);

    return {
      scope: "WORKSPACE",
      organizationId,
      overview,
      trends,
      agentUsage,
      projectActivity,
    };
  }
}
