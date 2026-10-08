import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_SCENE_STATUS } from "../../domain/constants/ai-video.constants.js";

export class UpdateSceneStatusUseCase {
  constructor({ videoProjectRepository, videoSceneRepository, calculateVideoProjectProgressUseCase = null }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
    this.calculateVideoProjectProgressUseCase = calculateVideoProjectProgressUseCase;
  }

  async execute({
    organizationId,
    sceneId,
    status,
    referenceImageUrl = null,
    videoUrl = null,
    audioUrl = null,
    errorMessage = null,
    metadata = null,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!sceneId) {
      throw new AppError("Scene ID is required", 400, "MISSING_SCENE_ID");
    }

    if (!status || !Object.values(AI_VIDEO_SCENE_STATUS).includes(status)) {
      throw new AppError(`Invalid scene status: ${status}`, 400, "INVALID_SCENE_STATUS");
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

    const extraPayload = {};
    if (referenceImageUrl !== null) extraPayload.referenceImageUrl = referenceImageUrl;
    if (videoUrl !== null) extraPayload.videoUrl = videoUrl;
    if (audioUrl !== null) extraPayload.audioUrl = audioUrl;
    if (errorMessage !== null) extraPayload.errorMessage = errorMessage;
    if (metadata !== null) extraPayload.metadata = metadata;

    const updatedScene = await this.videoSceneRepository.updateStatus(sceneId, status, extraPayload);

    if (this.calculateVideoProjectProgressUseCase) {
      await this.calculateVideoProjectProgressUseCase.execute({
        organizationId,
        projectId: scene.videoProjectId,
      });
    }

    return updatedScene;
  }
}
