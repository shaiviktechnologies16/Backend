import { AppError } from "../../../../common/errors/AppError.js";

export class GenerateVideoSceneStageUseCase {
  constructor({ videoGenerationOrchestrator }) {
    this.videoGenerationOrchestrator = videoGenerationOrchestrator;
  }

  async execute({
    organizationId,
    projectId,
    sceneId,
    stage,
    language = null,
    forceRegenerate = false,
    options = {},
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    if (!sceneId) {
      throw new AppError("Scene ID is required", 400, "MISSING_SCENE_ID");
    }

    if (!stage) {
      throw new AppError("Generation stage is required", 400, "MISSING_STAGE");
    }

    return this.videoGenerationOrchestrator.executeStage({
      organizationId,
      projectId,
      sceneId,
      stage,
      language,
      forceRegenerate,
      options,
    });
  }
}
