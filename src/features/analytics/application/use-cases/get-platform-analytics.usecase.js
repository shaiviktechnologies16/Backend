export class GetPlatformAnalyticsUseCase {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async execute({ from, to, interval = "day", limit = 10 } = {}) {
    const scope = {
      type: "PLATFORM",
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
      scope: "PLATFORM",
      overview,
      trends,
      agentUsage,
      projectActivity,
    };
  }
}
