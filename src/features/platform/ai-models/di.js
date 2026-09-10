import { AIModelRepositoryImpl } from "./infrastructure/repositories/ai-model.repository.impl.js";

import { CreateAIModelUseCase } from "./application/use-cases/create-ai-model.usecase.js";
import { GetAIModelsUseCase } from "./application/use-cases/get-ai-models.usecase.js";
import { GetAIModelUseCase } from "./application/use-cases/get-ai-model.usecase.js";
import { UpdateAIModelUseCase } from "./application/use-cases/update-ai-model.usecase.js";
import { UpdateAIModelStatusUseCase } from "./application/use-cases/update-ai-model-status.usecase.js";

import { AIModelController } from "./presentation/controllers/ai-model.controller.js";

export function createAIModelModule({ dataSource }) {
  const aiModelRepository = new AIModelRepositoryImpl(dataSource);

  const createAIModelUseCase = new CreateAIModelUseCase({
    aiModelRepository,
  });

  const getAIModelsUseCase = new GetAIModelsUseCase({
    aiModelRepository,
  });

  const getAIModelUseCase = new GetAIModelUseCase({
    aiModelRepository,
  });

  const updateAIModelUseCase = new UpdateAIModelUseCase({
    aiModelRepository,
  });

  const updateAIModelStatusUseCase = new UpdateAIModelStatusUseCase({
    aiModelRepository,
  });

  const aiModelController = new AIModelController({
    createAIModelUseCase,
    getAIModelsUseCase,
    getAIModelUseCase,
    updateAIModelUseCase,
    updateAIModelStatusUseCase,
  });

  return {
    aiModelRepository,
    createAIModelUseCase,
    getAIModelsUseCase,
    getAIModelUseCase,
    updateAIModelUseCase,
    updateAIModelStatusUseCase,
    aiModelController,
  };
}
