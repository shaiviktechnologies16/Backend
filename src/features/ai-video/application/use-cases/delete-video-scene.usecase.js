import { AppError } from "../../../../common/errors/AppError.js";

export class DeleteVideoSceneUseCase {
  constructor({ videoProjectRepository, videoSceneRepository }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
  }

  async execute({ organizationId, sceneId }) {
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

    const deleted = await this.videoSceneRepository.delete(sceneId);

    if (deleted) {
      const remainingScenes = await this.videoSceneRepository.findByProjectId(scene.videoProjectId);
      for (let i = 0; i < remainingScenes.length; i++) {
        const current = remainingScenes[i];
        if (current.sceneNumber !== i + 1) {
          await this.videoSceneRepository.update(current.id, { sceneNumber: i + 1 });
        }
      }
    }

    return {
      success: deleted,
      deletedSceneId: sceneId,
    };
  }
}
