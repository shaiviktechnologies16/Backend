import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateVideoSceneUseCase {
  constructor({ videoProjectRepository, videoSceneRepository }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
  }

  async execute({
    organizationId,
    sceneId,
    sceneNumber,
    duration,
    visualPrompt,
    motionPrompt,
    dialogue,
    speaker,
    characterIds,
    referenceImageUrl,
    metadata,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!sceneId) {
      throw new AppError("Scene ID is required", 400, "MISSING_SCENE_ID");
    }

    const scene = await this.videoSceneRepository.findById(sceneId);
    if (!scene) {
      throw new AppError("Video scene not found", 404, "SCENE_NOT_FOUND");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(
      scene.videoProjectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Video project not found or unauthorized", 404, "PROJECT_NOT_FOUND");
    }

    const updates = {};
    if (sceneNumber !== undefined) updates.sceneNumber = sceneNumber;
    if (duration !== undefined) updates.duration = Number(duration);
    if (visualPrompt !== undefined) updates.visualPrompt = visualPrompt;
    if (motionPrompt !== undefined) updates.motionPrompt = motionPrompt;
    if (dialogue !== undefined) updates.dialogue = dialogue;
    if (speaker !== undefined) updates.speaker = speaker;
    if (characterIds !== undefined) updates.characterIds = Array.isArray(characterIds) ? characterIds : [];
    if (referenceImageUrl !== undefined) updates.referenceImageUrl = referenceImageUrl;
    if (metadata !== undefined) updates.metadata = metadata;

    const updatedScene = await this.videoSceneRepository.update(sceneId, updates);
    return updatedScene;
  }
}
