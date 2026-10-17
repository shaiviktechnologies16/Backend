export class ProjectAnalyticsController {
  constructor({
    getProjectAnalyticsOverviewUseCase,
    getProjectAnalyticsTrendsUseCase,
    getProjectAnalyticsPagesUseCase,
    getProjectAnalyticsSourcesUseCase,
    getProjectAnalyticsDevicesUseCase,
    getProjectChatbotAnalyticsUseCase,
    getProjectTrackingConfigUseCase,
    updateProjectTrackingConfigUseCase,
    rotateProjectTrackingKeyUseCase,
  }) {
    this.getProjectAnalyticsOverviewUseCase =
      getProjectAnalyticsOverviewUseCase;
    this.getProjectAnalyticsTrendsUseCase = getProjectAnalyticsTrendsUseCase;
    this.getProjectAnalyticsPagesUseCase = getProjectAnalyticsPagesUseCase;
    this.getProjectAnalyticsSourcesUseCase = getProjectAnalyticsSourcesUseCase;
    this.getProjectAnalyticsDevicesUseCase = getProjectAnalyticsDevicesUseCase;
    this.getProjectChatbotAnalyticsUseCase = getProjectChatbotAnalyticsUseCase;
    this.getProjectTrackingConfigUseCase = getProjectTrackingConfigUseCase;
    this.updateProjectTrackingConfigUseCase =
      updateProjectTrackingConfigUseCase;
    this.rotateProjectTrackingKeyUseCase = rotateProjectTrackingKeyUseCase;
  }

  getOverview = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { from, to, period, timezone } = req.query;

      const result = await this.getProjectAnalyticsOverviewUseCase.execute({
        projectId,
        from,
        to,
        period,
        timezone,
      });

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
      const projectId = req.params.projectId;
      const { from, to, period, timezone } = req.query;

      const result = await this.getProjectAnalyticsTrendsUseCase.execute({
        projectId,
        from,
        to,
        period,
        timezone,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getPages = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { from, to, period, limit } = req.query;

      const result = await this.getProjectAnalyticsPagesUseCase.execute({
        projectId,
        from,
        to,
        period,
        limit: limit ? Number(limit) : 10,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getSources = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { from, to, period, limit } = req.query;

      const result = await this.getProjectAnalyticsSourcesUseCase.execute({
        projectId,
        from,
        to,
        period,
        limit: limit ? Number(limit) : 10,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getDevices = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { from, to, period } = req.query;

      const result = await this.getProjectAnalyticsDevicesUseCase.execute({
        projectId,
        from,
        to,
        period,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getChatbot = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { from, to, period, timezone } = req.query;

      const result = await this.getProjectChatbotAnalyticsUseCase.execute({
        projectId,
        from,
        to,
        period,
        timezone,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getConfig = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const organizationId =
        req.context?.organization?.id || req.headers["x-organization-id"];

      const result = await this.getProjectTrackingConfigUseCase.execute({
        projectId,
        organizationId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateConfig = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const { isEnabled, allowedDomains } = req.body;

      const result = await this.updateProjectTrackingConfigUseCase.execute({
        projectId,
        isEnabled,
        allowedDomains,
      });

      res.json({
        success: true,
        message: "Tracking configuration updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  rotateKey = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;

      const result = await this.rotateProjectTrackingKeyUseCase.execute({
        projectId,
      });

      res.json({
        success: true,
        message: "Tracking key rotated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

