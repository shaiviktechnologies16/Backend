import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateProjectTrackingConfigUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, isEnabled, allowedDomains }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    const updated = await this.projectAnalyticsRepository.updateConfig(
      projectId,
      {
        isEnabled,
        allowedDomains,
      },
    );

    if (!updated) {
      throw new AppError("Tracking config not found.", 404, "CONFIG_NOT_FOUND");
    }

    return updated;
  }
}
