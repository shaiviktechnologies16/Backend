import { AppError } from "../../../../common/errors/AppError.js";

export class GetVideoProjectUseCase {
  constructor({ videoProjectRepository, videoSceneRepository }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
  }

  async execute({ organizationId, projectId }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(
      projectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
    }

    let scenes = [];
    if (this.videoSceneRepository) {
      scenes = await this.videoSceneRepository.findByProjectId(projectId);
    }

    return {
      project,
      scenes,
    };
  }
}
