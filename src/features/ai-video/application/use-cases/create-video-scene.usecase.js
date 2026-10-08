import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_SCENE_STATUS } from "../../domain/constants/ai-video.constants.js";

export class CreateVideoSceneUseCase {
  constructor({ videoProjectRepository, videoSceneRepository }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
  }

  async execute({
    organizationId,
    videoProjectId,
    sceneNumber = null,
    duration = 5,
    visualPrompt = null,
    motionPrompt = null,
    dialogue = null,
    speaker = null,
    characterIds = [],
    referenceImageUrl = null,
    metadata = null,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!videoProjectId) {
      throw new AppError("Video project ID is required", 400, "MISSING_PROJECT_ID");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(
      videoProjectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
    }

    let finalSceneNumber = sceneNumber;
    if (!finalSceneNumber) {
      const existingScenes = await this.videoSceneRepository.findByProjectId(videoProjectId);
      finalSceneNumber = existingScenes.length + 1;
    }

    const sceneData = {
      videoProjectId,
      sceneNumber: finalSceneNumber,
      duration: Number(duration) || 5,
      visualPrompt: visualPrompt ? visualPrompt.trim() : null,
      motionPrompt: motionPrompt ? motionPrompt.trim() : null,
      dialogue: dialogue ? dialogue.trim() : null,
      speaker: speaker ? speaker.trim() : null,
      characterIds: Array.isArray(characterIds) ? characterIds : [],
      referenceImageUrl: referenceImageUrl ? referenceImageUrl.trim() : null,
      status: AI_VIDEO_SCENE_STATUS.PENDING,
      metadata: metadata || {},
    };

    const scene = await this.videoSceneRepository.create(sceneData);
    return scene;
  }
}
