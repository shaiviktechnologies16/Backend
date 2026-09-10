import { AppDataSource } from "../../database/datasource.js";

import { AnalyticsRepositoryImpl } from "./infrastructure/repositories/analytics.repository.impl.js";

import { AnalyticsService } from "./application/services/analytics.service.js";

import { GetAnalyticsOverviewUseCase } from "./application/use-cases/get-analytics-overview.usecase.js";
import { GetAnalyticsTrendsUseCase } from "./application/use-cases/get-analytics-trends.usecase.js";
import { GetAnalyticsAgentsUseCase } from "./application/use-cases/get-analytics-agents.usecase.js";
import { GetAnalyticsProjectsUseCase } from "./application/use-cases/get-analytics-projects.usecase.js";

import { AnalyticsController } from "./presentation/controllers/analytics.controller.js";

export const createAnalyticsModule = () => {
  const analyticsRepository = new AnalyticsRepositoryImpl(AppDataSource);

  const analyticsService = new AnalyticsService(analyticsRepository);

  const getAnalyticsOverviewUseCase = new GetAnalyticsOverviewUseCase(
    analyticsService,
  );

  const getAnalyticsTrendsUseCase = new GetAnalyticsTrendsUseCase(
    analyticsService,
  );

  const getAnalyticsAgentsUseCase = new GetAnalyticsAgentsUseCase(
    analyticsService,
  );

  const getAnalyticsProjectsUseCase = new GetAnalyticsProjectsUseCase(
    analyticsService,
  );

  const analyticsController = new AnalyticsController({
    getAnalyticsOverviewUseCase,
    getAnalyticsTrendsUseCase,
    getAnalyticsAgentsUseCase,
    getAnalyticsProjectsUseCase,
  });

  return {
    analyticsRepository,
    analyticsService,
    getAnalyticsOverviewUseCase,
    getAnalyticsTrendsUseCase,
    getAnalyticsAgentsUseCase,
    getAnalyticsProjectsUseCase,
    analyticsController,
  };
};
