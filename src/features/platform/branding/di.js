import { UpdatePlatformBrandingUseCase } from "./application/use-cases/update-platform-branding.usecase.js";
import { PlatformBrandingController } from "./presentation/controllers/platform-branding.controller.js";

export function createPlatformBrandingModule({ platformConfigRepository }) {
  const updatePlatformBrandingUseCase = new UpdatePlatformBrandingUseCase({
    platformConfigRepository,
  });

  const platformBrandingController = new PlatformBrandingController({
    updatePlatformBrandingUseCase,
  });

  return {
    updatePlatformBrandingUseCase,
    platformBrandingController,
  };
}
