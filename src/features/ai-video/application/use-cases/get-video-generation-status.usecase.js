import { AppError } from "../../../../common/errors/AppError.js";

export class GetVideoGenerationStatusUseCase {
  constructor({ videoProjectRepository, videoSceneRepository, calculateVideoProjectProgressUseCase }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
    this.calculateVideoProjectProgressUseCase = calculateVideoProjectProgressUseCase;
  }

  async execute({ organizationId, projectId }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(projectId, organizationId);
    if (!project) {
      throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
    }

    const scenes = await this.videoSceneRepository.findByProjectId(projectId);

    let progress = null;
    if (this.calculateVideoProjectProgressUseCase) {
      progress = await this.calculateVideoProjectProgressUseCase.execute({ organizationId, projectId });
    }

    const sceneStatuses = scenes.map((s) => ({
      sceneId: s.id,
      sceneNumber: s.sceneNumber,
      status: s.status,
      hasImage: !!s.referenceImageUrl,
      hasVideo: !!s.videoUrl,
      hasAudio: !!s.audioUrl,
      hasSubtitle: !!s.metadata?.subtitleUrl,
      errorMessage: s.errorMessage || null,
    }));

    return {
      projectId: project.id,
      status: project.status,
      progress,
      scenes: sceneStatuses,
    };
  }
}
