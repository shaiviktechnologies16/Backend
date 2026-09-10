import { PlatformApiKeyRepositoryImpl } from "./infrastructure/repositories/platform-api-key.repository.impl.js";
import { PlatformApiKeyEncryptionService } from "./infrastructure/security/platform-api-key-encryption.service.js";

import { CreatePlatformApiKeyUseCase } from "./application/use-cases/create-platform-api-key.usecase.js";
import { GetPlatformApiKeysUseCase } from "./application/use-cases/get-platform-api-keys.usecase.js";
import { UpdatePlatformApiKeyUseCase } from "./application/use-cases/update-platform-api-key.usecase.js";
import { DeletePlatformApiKeyUseCase } from "./application/use-cases/delete-platform-api-key.usecase.js";
import { GetPlatformApiKeyValueUseCase } from "./application/use-cases/get-platform-api-key-value.usecase.js";

import { PlatformApiKeyController } from "./presentation/controllers/platform-api-key.controller.js";

export function createPlatformApiKeysModule({ dataSource }) {
  const platformApiKeyRepository = new PlatformApiKeyRepositoryImpl(dataSource);

  const encryptionService = new PlatformApiKeyEncryptionService();

  const createPlatformApiKeyUseCase = new CreatePlatformApiKeyUseCase({
    platformApiKeyRepository,
    encryptionService,
  });

  const getPlatformApiKeysUseCase = new GetPlatformApiKeysUseCase({
    platformApiKeyRepository,
  });

  const getPlatformApiKeyValueUseCase = new GetPlatformApiKeyValueUseCase({
    platformApiKeyRepository,
    encryptionService,
  });
  const updatePlatformApiKeyUseCase = new UpdatePlatformApiKeyUseCase({
    platformApiKeyRepository,
    encryptionService,
  });

  const deletePlatformApiKeyUseCase = new DeletePlatformApiKeyUseCase({
    platformApiKeyRepository,
  });

  const platformApiKeyController = new PlatformApiKeyController(
    createPlatformApiKeyUseCase,
    getPlatformApiKeysUseCase,
    updatePlatformApiKeyUseCase,
    deletePlatformApiKeyUseCase,
  );
  return {
    platformApiKeyRepository,
    encryptionService,
    platformApiKeyController,
    createPlatformApiKeyUseCase,
    getPlatformApiKeysUseCase,
    getPlatformApiKeyValueUseCase,
    updatePlatformApiKeyUseCase,
    deletePlatformApiKeyUseCase,
  };
}
