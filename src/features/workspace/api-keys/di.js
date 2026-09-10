import { WorkspaceApiKeyRepositoryImpl } from "./infrastructure/repositories/workspace-api-key.repository.impl.js";
import { ApiKeyEncryptionService } from "./infrastructure/security/api-key-encryption.service.js";

import { CreateWorkspaceApiKeyUseCase } from "./application/use-cases/create-workspace-api-key.usecase.js";
import { GetWorkspaceApiKeysUseCase } from "./application/use-cases/get-workspace-api-keys.usecase.js";
import { UpdateWorkspaceApiKeyUseCase } from "./application/use-cases/update-workspace-api-key.usecase.js";
import { DeleteWorkspaceApiKeyUseCase } from "./application/use-cases/delete-workspace-api-key.usecase.js";

import { WorkspaceApiKeyController } from "./presentation/controllers/workspace-api-key.controller.js";

export function createWorkspaceApiKeysModule({ dataSource }) {
  const workspaceApiKeyRepository = new WorkspaceApiKeyRepositoryImpl(
    dataSource,
  );

  const encryptionService = new ApiKeyEncryptionService();

  const createWorkspaceApiKeyUseCase = new CreateWorkspaceApiKeyUseCase({
    workspaceApiKeyRepository,
    encryptionService,
  });

  const getWorkspaceApiKeysUseCase = new GetWorkspaceApiKeysUseCase({
    workspaceApiKeyRepository,
  });

  const updateWorkspaceApiKeyUseCase = new UpdateWorkspaceApiKeyUseCase({
    workspaceApiKeyRepository,
    encryptionService,
  });

  const deleteWorkspaceApiKeyUseCase = new DeleteWorkspaceApiKeyUseCase({
    workspaceApiKeyRepository,
  });

  const workspaceApiKeyController = new WorkspaceApiKeyController({
    createWorkspaceApiKeyUseCase,
    getWorkspaceApiKeysUseCase,
    updateWorkspaceApiKeyUseCase,
    deleteWorkspaceApiKeyUseCase,
  });

  return {
    workspaceApiKeyRepository,
    encryptionService,
    createWorkspaceApiKeyUseCase,
    getWorkspaceApiKeysUseCase,
    updateWorkspaceApiKeyUseCase,
    deleteWorkspaceApiKeyUseCase,
    workspaceApiKeyController,
  };
}
