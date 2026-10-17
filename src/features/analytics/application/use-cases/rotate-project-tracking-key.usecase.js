import { AppError } from "../../../../common/errors/AppError.js";

export class RotateProjectTrackingKeyUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    const rotated =
      await this.projectAnalyticsRepository.rotateTrackingKey(projectId);

    if (!rotated) {
      throw new AppError("Tracking config not found.", 404, "CONFIG_NOT_FOUND");
    }

    return rotated;
  }
}
