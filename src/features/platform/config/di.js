import { PlatformConfigRepositoryImpl } from "./infrastructure/repositories/platform-config.repository.impl.js";

import { CreatePlatformConfigUseCase } from "./application/use-cases/create-platform-config.usecase.js";
import { GetPlatformConfigUseCase } from "./application/use-cases/get-platform-config.usecase.js";
import { UpdatePlatformConfigUseCase } from "./application/use-cases/update-platform-config.usecase.js";

import { PlatformConfigController } from "./presentation/controllers/platform-config.controller.js";

import { PlatformApiKeyEncryptionService } from "../api-keys/infrastructure/security/platform-api-key-encryption.service.js";

export function createPlatformConfigModule({ dataSource }) {
  const platformConfigRepository = new PlatformConfigRepositoryImpl(dataSource);

  const encryptionService = new PlatformApiKeyEncryptionService();

  const createPlatformConfigUseCase = new CreatePlatformConfigUseCase({
    platformConfigRepository,
    encryptionService,
  });

  const getPlatformConfigUseCase = new GetPlatformConfigUseCase({
    platformConfigRepository,
    encryptionService,
  });

  const updatePlatformConfigUseCase = new UpdatePlatformConfigUseCase({
    platformConfigRepository,
    encryptionService,
  });

  const platformConfigController = new PlatformConfigController(
    createPlatformConfigUseCase,
    getPlatformConfigUseCase,
    updatePlatformConfigUseCase,
  );

  return {
    platformConfigRepository,
    createPlatformConfigUseCase,
    getPlatformConfigUseCase,
    updatePlatformConfigUseCase,
    platformConfigController,
  };
}
