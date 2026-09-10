import { GetWorkspaceBrandingUseCase } from "./application/use-cases/get-workspace-branding.usecase.js";
import { WorkspaceBrandingController } from "./presentation/controllers/workspace-branding.controller.js";

export function createWorkspaceBrandingModule({ organizationRepository }) {
  const getWorkspaceBrandingUseCase = new GetWorkspaceBrandingUseCase({
    organizationRepository,
  });

  const workspaceBrandingController = new WorkspaceBrandingController({
    getWorkspaceBrandingUseCase,
  });

  return {
    getWorkspaceBrandingUseCase,
    workspaceBrandingController,
  };
}
