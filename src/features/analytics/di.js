import { AppDataSource } from "../../database/datasource.js";

import { AnalyticsRepositoryImpl } from "./infrastructure/repositories/analytics.repository.impl.js";
import { ProjectAnalyticsRepositoryImpl } from "./infrastructure/repositories/project-analytics.repository.impl.js";

import { AnalyticsService } from "./application/services/analytics.service.js";

import { GetAnalyticsOverviewUseCase } from "./application/use-cases/get-analytics-overview.usecase.js";
import { GetAnalyticsTrendsUseCase } from "./application/use-cases/get-analytics-trends.usecase.js";
import { GetAnalyticsAgentsUseCase } from "./application/use-cases/get-analytics-agents.usecase.js";
import { GetAnalyticsProjectsUseCase } from "./application/use-cases/get-analytics-projects.usecase.js";

import { RecordVisitorEventUseCase } from "./application/use-cases/record-visitor-event.usecase.js";
import { GetProjectAnalyticsOverviewUseCase } from "./application/use-cases/get-project-analytics-overview.usecase.js";
import { GetProjectAnalyticsTrendsUseCase } from "./application/use-cases/get-project-analytics-trends.usecase.js";
import { GetProjectAnalyticsPagesUseCase } from "./application/use-cases/get-project-analytics-pages.usecase.js";
import { GetProjectAnalyticsSourcesUseCase } from "./application/use-cases/get-project-analytics-sources.usecase.js";
import { GetProjectAnalyticsDevicesUseCase } from "./application/use-cases/get-project-analytics-devices.usecase.js";
import { GetProjectChatbotAnalyticsUseCase } from "./application/use-cases/get-project-chatbot-analytics.usecase.js";
import { GetProjectTrackingConfigUseCase } from "./application/use-cases/get-project-tracking-config.usecase.js";
import { UpdateProjectTrackingConfigUseCase } from "./application/use-cases/update-project-tracking-config.usecase.js";
import { RotateProjectTrackingKeyUseCase } from "./application/use-cases/rotate-project-tracking-key.usecase.js";
import { GetProjectAnalyticsVisitorsUseCase } from "./application/use-cases/get-project-analytics-visitors.usecase.js";
import { GetProjectVisitorDetailsUseCase } from "./application/use-cases/get-project-visitor-details.usecase.js";
import { GetProjectAnalyticsLandingPagesUseCase } from "./application/use-cases/get-project-analytics-landing-pages.usecase.js";
import { GetProjectAnalyticsCampaignsUseCase } from "./application/use-cases/get-project-analytics-campaigns.usecase.js";

import { AnalyticsController } from "./presentation/controllers/analytics.controller.js";
import { ProjectAnalyticsController } from "./presentation/controllers/project-analytics.controller.js";
import { PublicAnalyticsController } from "./presentation/controllers/public-analytics.controller.js";

import { createProjectAnalyticsRoutes } from "./presentation/routes/project-analytics.routes.js";
import { createPublicAnalyticsRoutes } from "./presentation/routes/public-analytics.routes.js";

export const createAnalyticsModule = ({ projectRepository = null } = {}) => {
  const analyticsRepository = new AnalyticsRepositoryImpl(AppDataSource);
  const projectAnalyticsRepository = new ProjectAnalyticsRepositoryImpl(
    AppDataSource,
  );

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

  const recordVisitorEventUseCase = new RecordVisitorEventUseCase({
    projectAnalyticsRepository,
  });

  const getProjectAnalyticsOverviewUseCase =
    new GetProjectAnalyticsOverviewUseCase({
      projectAnalyticsRepository,
    });

  const getProjectAnalyticsTrendsUseCase = new GetProjectAnalyticsTrendsUseCase({
    projectAnalyticsRepository,
  });

  const getProjectAnalyticsPagesUseCase = new GetProjectAnalyticsPagesUseCase({
    projectAnalyticsRepository,
  });

  const getProjectAnalyticsSourcesUseCase =
    new GetProjectAnalyticsSourcesUseCase({
      projectAnalyticsRepository,
    });

  const getProjectAnalyticsDevicesUseCase =
    new GetProjectAnalyticsDevicesUseCase({
      projectAnalyticsRepository,
    });

  const getProjectChatbotAnalyticsUseCase =
    new GetProjectChatbotAnalyticsUseCase({
      projectAnalyticsRepository,
    });

  const getProjectTrackingConfigUseCase = new GetProjectTrackingConfigUseCase({
    projectAnalyticsRepository,
    projectRepository: projectRepository || {
      findById: async (id) => {
        const rows = await AppDataSource.manager.query(
          "SELECT id, organization_id AS \"organizationId\" FROM projects WHERE id = $1 LIMIT 1",
          [id],
        );
        return rows[0] || null;
      },
    },
  });

  const updateProjectTrackingConfigUseCase =
    new UpdateProjectTrackingConfigUseCase({
      projectAnalyticsRepository,
    });

  const rotateProjectTrackingKeyUseCase = new RotateProjectTrackingKeyUseCase({
    projectAnalyticsRepository,
  });

  const getProjectAnalyticsVisitorsUseCase =
    new GetProjectAnalyticsVisitorsUseCase({
      projectAnalyticsRepository,
    });

  const getProjectVisitorDetailsUseCase =
    new GetProjectVisitorDetailsUseCase({
      projectAnalyticsRepository,
    });

  const getProjectAnalyticsLandingPagesUseCase =
    new GetProjectAnalyticsLandingPagesUseCase({
      projectAnalyticsRepository,
    });

  const getProjectAnalyticsCampaignsUseCase =
    new GetProjectAnalyticsCampaignsUseCase({
      projectAnalyticsRepository,
    });

  const analyticsController = new AnalyticsController({
    getAnalyticsOverviewUseCase,
    getAnalyticsTrendsUseCase,
    getAnalyticsAgentsUseCase,
    getAnalyticsProjectsUseCase,
  });

  const projectAnalyticsController = new ProjectAnalyticsController({
    getProjectAnalyticsOverviewUseCase,
    getProjectAnalyticsTrendsUseCase,
    getProjectAnalyticsPagesUseCase,
    getProjectAnalyticsSourcesUseCase,
    getProjectAnalyticsDevicesUseCase,
    getProjectChatbotAnalyticsUseCase,
    getProjectTrackingConfigUseCase,
    updateProjectTrackingConfigUseCase,
    rotateProjectTrackingKeyUseCase,
    getProjectAnalyticsVisitorsUseCase,
    getProjectVisitorDetailsUseCase,
    getProjectAnalyticsLandingPagesUseCase,
    getProjectAnalyticsCampaignsUseCase,
  });

  const publicAnalyticsController = new PublicAnalyticsController({
    recordVisitorEventUseCase,
  });

  return {
    analyticsRepository,
    projectAnalyticsRepository,
    analyticsService,
    getAnalyticsOverviewUseCase,
    getAnalyticsTrendsUseCase,
    getAnalyticsAgentsUseCase,
    getAnalyticsProjectsUseCase,
    recordVisitorEventUseCase,
    getProjectAnalyticsOverviewUseCase,
    getProjectAnalyticsTrendsUseCase,
    getProjectAnalyticsPagesUseCase,
    getProjectAnalyticsSourcesUseCase,
    getProjectAnalyticsDevicesUseCase,
    getProjectChatbotAnalyticsUseCase,
    getProjectTrackingConfigUseCase,
    updateProjectTrackingConfigUseCase,
    rotateProjectTrackingKeyUseCase,
    analyticsController,
    projectAnalyticsController,
    publicAnalyticsController,
    createProjectAnalyticsRoutes,
    createPublicAnalyticsRoutes,
  };
};
