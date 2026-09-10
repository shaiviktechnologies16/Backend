import { AISettingsRepositoryImpl } from "./infrastructure/repositories/ai-settings.repository.impl.js";

import { GetAISettingsUseCase } from "./application/use-cases/get-ai-settings.usecase.js";
import { UpdateAISettingsUseCase } from "./application/use-cases/update-ai-settings.usecase.js";

import { AISettingsController } from "./presentation/controllers/ai-settings.controller.js";

export function createAISettingsModule({ dataSource }) {
  const aiSettingsRepository = new AISettingsRepositoryImpl(dataSource);

  const getAISettingsUseCase = new GetAISettingsUseCase({
    aiSettingsRepository,
  });

  const updateAISettingsUseCase = new UpdateAISettingsUseCase({
    aiSettingsRepository,
  });

  const aiSettingsController = new AISettingsController({
    getAISettingsUseCase,
    updateAISettingsUseCase,
  });

  return {
    aiSettingsRepository,
    getAISettingsUseCase,
    updateAISettingsUseCase,
    aiSettingsController,
  };
}
