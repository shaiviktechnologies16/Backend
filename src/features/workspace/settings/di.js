import { WorkspaceSettingsRepositoryImpl } from "./infrastructure/repositories/workspace-settings.repository.impl.js";

import { GetWorkspaceSettingsUseCase } from "./application/use-cases/get-workspace-settings.usecase.js";
import { UpdateWorkspaceSettingsUseCase } from "./application/use-cases/update-workspace-settings.usecase.js";

import { WorkspaceSettingsController } from "./presentation/controllers/workspace-settings.controller.js";

export function createWorkspaceSettingsModule({
  dataSource,
  contextMiddleware,
}) {
  const workspaceSettingsRepository = new WorkspaceSettingsRepositoryImpl(
    dataSource,
  );

  const getWorkspaceSettingsUseCase = new GetWorkspaceSettingsUseCase({
    workspaceSettingsRepository,
  });

  const updateWorkspaceSettingsUseCase = new UpdateWorkspaceSettingsUseCase({
    workspaceSettingsRepository,
  });

  const workspaceSettingsController = new WorkspaceSettingsController({
    getWorkspaceSettingsUseCase,
    updateWorkspaceSettingsUseCase,
  });

  return {
    workspaceSettingsRepository,
    getWorkspaceSettingsUseCase,
    updateWorkspaceSettingsUseCase,
    workspaceSettingsController,
    contextMiddleware,
  };
}
