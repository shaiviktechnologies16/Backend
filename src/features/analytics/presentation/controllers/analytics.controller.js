export class AnalyticsController {
  constructor({
    getAnalyticsOverviewUseCase,
    getAnalyticsTrendsUseCase,
    getAnalyticsAgentsUseCase,
    getAnalyticsProjectsUseCase,
  }) {
    this.getAnalyticsOverviewUseCase = getAnalyticsOverviewUseCase;
    this.getAnalyticsTrendsUseCase = getAnalyticsTrendsUseCase;
    this.getAnalyticsAgentsUseCase = getAnalyticsAgentsUseCase;
    this.getAnalyticsProjectsUseCase = getAnalyticsProjectsUseCase;
  }

  getOverview = async (req, res, next) => {
    try {
      const scope = this.getScope(req);

      const result = await this.getAnalyticsOverviewUseCase.execute(scope);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getTrends = async (req, res, next) => {
    try {
      const scope = this.getScope(req);

      const result = await this.getAnalyticsTrendsUseCase.execute({
        scope,
        from: req.query.from,
        to: req.query.to,
        interval: req.query.interval ?? "day",
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAgents = async (req, res, next) => {
    try {
      const scope = this.getScope(req);

      const result = await this.getAnalyticsAgentsUseCase.execute({
        scope,
        from: req.query.from,
        to: req.query.to,
        limit: Number(req.query.limit ?? 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProjects = async (req, res, next) => {
    try {
      const scope = this.getScope(req);

      const result = await this.getAnalyticsProjectsUseCase.execute({
        scope,
        from: req.query.from,
        to: req.query.to,
        limit: Number(req.query.limit ?? 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getScope(req) {
    const organizationId =
      req.headers["x-organization-id"] ||
      req.context?.organization?.id ||
      req.context?.organizationId;

    const isPlatform =
      req.user?.platformRole === "PLATFORM_ADMIN" ||
      req.user?.platformRole === "PLATFORM_MANAGER";

    if (organizationId) {
      return {
        type: "WORKSPACE",
        organizationId,
      };
    }

    if (isPlatform) {
      return {
        type: "PLATFORM",
        organizationId: null,
      };
    }

    const error = new Error("Organization context is required.");

    error.statusCode = 400;
    error.code = "ORGANIZATION_CONTEXT_REQUIRED";

    throw error;
  }
}
