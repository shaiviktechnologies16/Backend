import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_PROJECT_STATUS, AI_VIDEO_ASPECT_RATIO, AI_VIDEO_LANGUAGE } from "../../domain/constants/ai-video.constants.js";

export class CreateVideoProjectUseCase {
  constructor({ videoProjectRepository, checkPlanUsageUseCase = null }) {
    this.videoProjectRepository = videoProjectRepository;
    this.checkPlanUsageUseCase = checkPlanUsageUseCase;
  }

  async execute({
    organizationId,
    createdById,
    name,
    prompt = null,
    language = AI_VIDEO_LANGUAGE.ENGLISH,
    aspectRatio = AI_VIDEO_ASPECT_RATIO.PORTRAIT_9_16,
    duration = 30,
    style = "cartoon",
    projectId = null,
    metadata = null,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!createdById) {
      throw new AppError("Created by User ID is required", 400, "MISSING_USER_ID");
    }

    if (!name || !name.trim()) {
      throw new AppError("Video project name is required", 400, "INVALID_PROJECT_NAME");
    }

    if (this.checkPlanUsageUseCase) {
      await this.checkPlanUsageUseCase.execute({ organizationId });
    }

    const projectData = {
      organizationId,
      createdById,
      projectId,
      name: name.trim(),
      prompt: prompt ? prompt.trim() : null,
      language: Object.values(AI_VIDEO_LANGUAGE).includes(language) ? language : AI_VIDEO_LANGUAGE.ENGLISH,
      aspectRatio: Object.values(AI_VIDEO_ASPECT_RATIO).includes(aspectRatio) ? aspectRatio : AI_VIDEO_ASPECT_RATIO.PORTRAIT_9_16,
      duration: Number(duration) || 30,
      style: style ? style.trim() : "cartoon",
      status: AI_VIDEO_PROJECT_STATUS.DRAFT,
      metadata: metadata || {},
    };

    const project = await this.videoProjectRepository.create(projectData);
    return project;
  }
}
