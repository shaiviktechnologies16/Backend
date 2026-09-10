import { WorkspaceDashboardRepositoryImpl } from "./infrastructure/repositories/workspace-dashboard.repository.impl.js";

import { GetWorkspaceDashboardUseCase } from "./application/use-cases/get-workspace-dashboard.usecase.js";

import { WorkspaceDashboardController } from "./presentation/controllers/workspace-dashboard.controller.js";
import { createWorkspaceDashboardRoutes } from "./presentation/routes/workspace-dashboard.routes.js";

export function createWorkspaceDashboardModule({
  organizationRepository,
  projectRepository,
  organizationMemberRepository,
  agentRepository,
  conversationRepository,
  requireWorkspaceAccess,
}) {
  const workspaceDashboardRepository = new WorkspaceDashboardRepositoryImpl({
    projectRepository,
    organizationMemberRepository,
    agentRepository,
    conversationRepository,
  });

  const getWorkspaceDashboardUseCase = new GetWorkspaceDashboardUseCase({
    workspaceDashboardRepository,
    organizationRepository,
  });

  const workspaceDashboardController = new WorkspaceDashboardController({
    getWorkspaceDashboardUseCase,
  });

  const router = createWorkspaceDashboardRoutes({
    workspaceDashboardController,
    middleware: requireWorkspaceAccess,
  });

  return {
    workspaceDashboardRepository,
    getWorkspaceDashboardUseCase,
    workspaceDashboardController,
    router,
    contextMiddleware: requireWorkspaceAccess,
  };
}
