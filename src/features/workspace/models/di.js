import { WorkspaceModelRepositoryImpl } from "./infrastructure/repositories/workspace-model.repository.impl.js";
import { GetWorkspaceModelsUseCase } from "./application/use-cases/get-workspace-models.usecase.js";
import { WorkspaceModelController } from "./presentation/controllers/workspace-model.controller.js";

export function createWorkspaceModelModule({
  dataSource,
  contextMiddleware,
  organizationModelEntitlementService = null,
}) {
  const workspaceModelRepository = new WorkspaceModelRepositoryImpl(
    dataSource,
    organizationModelEntitlementService,
  );

  const getWorkspaceModelsUseCase = new GetWorkspaceModelsUseCase({
    workspaceModelRepository,
  });

  const workspaceModelController = new WorkspaceModelController({
    getWorkspaceModelsUseCase,
  });

  return {
    workspaceModelRepository,
    getWorkspaceModelsUseCase,
    workspaceModelController,
    contextMiddleware,
  };
}
