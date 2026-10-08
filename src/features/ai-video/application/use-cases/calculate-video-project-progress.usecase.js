import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_PROJECT_STATUS, AI_VIDEO_SCENE_STATUS } from "../../domain/constants/ai-video.constants.js";

export class CalculateVideoProjectProgressUseCase {
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

    const scenes = await this.videoSceneRepository.findByProjectId(projectId);
    const totalScenes = scenes.length;

    if (totalScenes === 0) {
      return {
        progressPercentage: 0,
        overallStatus: project.status,
        breakdown: {
          totalScenes: 0,
          completedScenes: 0,
          failedScenes: 0,
          pendingScenes: 0,
          inProgressScenes: 0,
        },
      };
    }

    let completedScenes = 0;
    let failedScenes = 0;
    let pendingScenes = 0;
    let inProgressScenes = 0;

    const activeProcessingStatuses = [
      AI_VIDEO_SCENE_STATUS.IMAGE_GENERATING,
      AI_VIDEO_SCENE_STATUS.VIDEO_GENERATING,
      AI_VIDEO_SCENE_STATUS.TTS_GENERATING,
      AI_VIDEO_SCENE_STATUS.LIP_SYNC_GENERATING,
    ];

    for (const scene of scenes) {
      if (scene.status === AI_VIDEO_SCENE_STATUS.COMPLETED || scene.status === AI_VIDEO_SCENE_STATUS.VIDEO_READY) {
        completedScenes++;
      } else if (scene.status === AI_VIDEO_SCENE_STATUS.FAILED) {
        failedScenes++;
      } else if (activeProcessingStatuses.includes(scene.status)) {
        inProgressScenes++;
      } else {
        pendingScenes++;
      }
    }

    const progressPercentage = Math.round(
      ((completedScenes + (failedScenes * 0.5)) / totalScenes) * 100
    );

    let calculatedStatus = project.status;

    if (completedScenes === totalScenes) {
      calculatedStatus = AI_VIDEO_PROJECT_STATUS.COMPLETED;
    } else if (failedScenes === totalScenes) {
      calculatedStatus = AI_VIDEO_PROJECT_STATUS.FAILED;
    } else if (inProgressScenes > 0) {
      calculatedStatus = AI_VIDEO_PROJECT_STATUS.PROCESSING;
    } else if (completedScenes > 0 || failedScenes > 0) {
      calculatedStatus = AI_VIDEO_PROJECT_STATUS.GENERATING;
    }

    if (calculatedStatus !== project.status) {
      const updatedMetadata = {
        ...(project.metadata || {}),
        progressPercentage,
        sceneBreakdown: {
          totalScenes,
          completedScenes,
          failedScenes,
          pendingScenes,
          inProgressScenes,
        },
      };

      await this.videoProjectRepository.updateStatus(projectId, calculatedStatus, {
        metadata: updatedMetadata,
      });
    }

    return {
      progressPercentage,
      overallStatus: calculatedStatus,
      breakdown: {
        totalScenes,
        completedScenes,
        failedScenes,
        pendingScenes,
        inProgressScenes,
      },
    };
  }
}
