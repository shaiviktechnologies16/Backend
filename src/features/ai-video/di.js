import { TypeOrmVideoProjectRepository } from "./infrastructure/repositories/typeorm-video-project.repository.js";
import { TypeOrmVideoSceneRepository } from "./infrastructure/repositories/typeorm-video-scene.repository.js";
import { TypeOrmVideoCharacterRepository } from "./infrastructure/repositories/typeorm-video-character.repository.js";
import { TypeOrmVideoAssetRepository } from "./infrastructure/repositories/typeorm-video-asset.repository.js";

import { CreateVideoProjectUseCase } from "./application/use-cases/create-video-project.usecase.js";
import { GetVideoProjectUseCase } from "./application/use-cases/get-video-project.usecase.js";
import { ListVideoProjectsUseCase } from "./application/use-cases/list-video-projects.usecase.js";
import { DeleteVideoProjectUseCase } from "./application/use-cases/delete-video-project.usecase.js";
import { CreateVideoCharacterUseCase } from "./application/use-cases/create-video-character.usecase.js";
import { ListVideoCharactersUseCase } from "./application/use-cases/list-video-characters.usecase.js";
import { GetVideoCharacterUseCase } from "./application/use-cases/get-video-character.usecase.js";
import { UploadCharacterReferenceImageUseCase } from "./application/use-cases/upload-character-reference-image.usecase.js";
import { CreateVideoSceneUseCase } from "./application/use-cases/create-video-scene.usecase.js";
import { UpdateVideoSceneUseCase } from "./application/use-cases/update-video-scene.usecase.js";
import { DeleteVideoSceneUseCase } from "./application/use-cases/delete-video-scene.usecase.js";
import { UpdateSceneStatusUseCase } from "./application/use-cases/update-scene-status.usecase.js";
import { GenerateVideoScriptUseCase } from "./application/use-cases/generate-video-script.usecase.js";
import { GenerateVideoStoryboardUseCase } from "./application/use-cases/generate-video-storyboard.usecase.js";
import { CalculateVideoProjectProgressUseCase } from "./application/use-cases/calculate-video-project-progress.usecase.js";

import { GenerateVideoSceneStageUseCase } from "./application/use-cases/generate-video-scene-stage.usecase.js";
import { RetryVideoSceneStageUseCase } from "./application/use-cases/retry-video-scene-stage.usecase.js";
import { GenerateVideoSceneVideoUseCase } from "./application/use-cases/generate-video-scene-video.usecase.js";
import { GenerateVideoSceneImageUseCase } from "./application/use-cases/generate-video-scene-image.usecase.js";
import { GetVideoGenerationStatusUseCase } from "./application/use-cases/get-video-generation-status.usecase.js";

import { VideoProviderFactory } from "./application/services/video-provider.factory.js";
import { VideoGenerationOrchestrator } from "./application/services/video-generation.orchestrator.js";

import { VideoProjectController } from "./presentation/controllers/video-project.controller.js";
import { VideoCharacterController } from "./presentation/controllers/video-character.controller.js";
import { VideoSceneController } from "./presentation/controllers/video-scene.controller.js";
import { AiDirectorController } from "./presentation/controllers/ai-director.controller.js";

export const createAiVideoModule = ({
  dataSource,
  aiProviderFactory,
  synthesizeSpeechUseCase = null,
  getPlatformApiKeyValueUseCase = null,
  checkPlanUsageUseCase = null,
  storageProvider = null,
  uploadFileUseCase = null,
}) => {
  const videoProjectRepository = new TypeOrmVideoProjectRepository(dataSource);
  const videoSceneRepository = new TypeOrmVideoSceneRepository(dataSource);
  const videoCharacterRepository = new TypeOrmVideoCharacterRepository(dataSource);
  const videoAssetRepository = new TypeOrmVideoAssetRepository(dataSource);

  const videoProviderFactory = new VideoProviderFactory({
    synthesizeSpeechUseCase,
    getPlatformApiKeyValueUseCase,
    storageProvider,
    uploadFileUseCase,
  });

  const calculateVideoProjectProgressUseCase = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const videoGenerationOrchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    videoAssetRepository,
    videoProviderFactory,
    calculateVideoProjectProgressUseCase,
  });

  const generateVideoSceneStageUseCase = new GenerateVideoSceneStageUseCase({
    videoGenerationOrchestrator,
  });

  const retryVideoSceneStageUseCase = new RetryVideoSceneStageUseCase({
    videoGenerationOrchestrator,
  });

  const generateVideoSceneVideoUseCase = new GenerateVideoSceneVideoUseCase({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    videoAssetRepository,
    videoProviderFactory,
    storageProvider,
    uploadFileUseCase,
    calculateVideoProjectProgressUseCase,
  });

  const generateVideoSceneImageUseCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    videoAssetRepository,
    videoProviderFactory,
    calculateVideoProjectProgressUseCase,
  });

  const getVideoGenerationStatusUseCase = new GetVideoGenerationStatusUseCase({
    videoProjectRepository,
    videoSceneRepository,
    calculateVideoProjectProgressUseCase,
  });

  const createVideoProjectUseCase = new CreateVideoProjectUseCase({
    videoProjectRepository,
    checkPlanUsageUseCase,
  });

  const getVideoProjectUseCase = new GetVideoProjectUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const listVideoProjectsUseCase = new ListVideoProjectsUseCase({
    videoProjectRepository,
  });

  const deleteVideoProjectUseCase = new DeleteVideoProjectUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const createVideoCharacterUseCase = new CreateVideoCharacterUseCase({
    videoCharacterRepository,
  });

  const listVideoCharactersUseCase = new ListVideoCharactersUseCase({
    videoCharacterRepository,
  });

  const getVideoCharacterUseCase = new GetVideoCharacterUseCase({
    videoCharacterRepository,
  });

  const uploadCharacterReferenceImageUseCase = new UploadCharacterReferenceImageUseCase({
    storageProvider,
    uploadFileUseCase,
  });

  const createVideoSceneUseCase = new CreateVideoSceneUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const updateVideoSceneUseCase = new UpdateVideoSceneUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const deleteVideoSceneUseCase = new DeleteVideoSceneUseCase({
    videoProjectRepository,
    videoSceneRepository,
  });

  const updateSceneStatusUseCase = new UpdateSceneStatusUseCase({
    videoProjectRepository,
    videoSceneRepository,
    calculateVideoProjectProgressUseCase,
  });

  const generateVideoScriptUseCase = new GenerateVideoScriptUseCase({
    videoProjectRepository,
    aiProviderFactory,
  });

  const generateVideoStoryboardUseCase = new GenerateVideoStoryboardUseCase({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    aiProviderFactory,
  });

  // Controllers
  const videoProjectController = new VideoProjectController({
    createVideoProjectUseCase,
    getVideoProjectUseCase,
    listVideoProjectsUseCase,
    deleteVideoProjectUseCase,
  });

  const videoCharacterController = new VideoCharacterController({
    createVideoCharacterUseCase,
    getVideoCharacterUseCase,
    listVideoCharactersUseCase,
    uploadCharacterReferenceImageUseCase,
  });

  const videoSceneController = new VideoSceneController({
    createVideoSceneUseCase,
    updateVideoSceneUseCase,
    deleteVideoSceneUseCase,
    updateSceneStatusUseCase,
    generateVideoSceneVideoUseCase,
    generateVideoSceneImageUseCase,
    generateVideoSceneStageUseCase,
    retryVideoSceneStageUseCase,
  });

  const aiDirectorController = new AiDirectorController({
    generateVideoScriptUseCase,
    generateVideoStoryboardUseCase,
    calculateVideoProjectProgressUseCase,
  });

  return {
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    videoAssetRepository,

    videoProviderFactory,
    videoGenerationOrchestrator,
    generateVideoSceneStageUseCase,
    retryVideoSceneStageUseCase,
    generateVideoSceneVideoUseCase,
    generateVideoSceneImageUseCase,
    getVideoGenerationStatusUseCase,

    createVideoProjectUseCase,
    getVideoProjectUseCase,
    listVideoProjectsUseCase,
    deleteVideoProjectUseCase,

    createVideoCharacterUseCase,
    listVideoCharactersUseCase,
    getVideoCharacterUseCase,
    uploadCharacterReferenceImageUseCase,

    createVideoSceneUseCase,
    updateVideoSceneUseCase,
    deleteVideoSceneUseCase,
    updateSceneStatusUseCase,

    generateVideoScriptUseCase,
    generateVideoStoryboardUseCase,
    calculateVideoProjectProgressUseCase,

    videoProjectController,
    videoCharacterController,
    videoSceneController,
    aiDirectorController,
  };
};
