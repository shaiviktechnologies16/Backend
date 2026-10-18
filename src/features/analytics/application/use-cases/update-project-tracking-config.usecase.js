import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateProjectTrackingConfigUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, isEnabled, allowedDomains, trackingKey }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    if (trackingKey !== undefined && trackingKey !== null) {
      if (typeof trackingKey !== "string" || !/^shv_trk_[a-f0-9]{24}$/.test(trackingKey.trim())) {
        throw new AppError("Invalid tracking key format.", 400, "INVALID_TRACKING_KEY_FORMAT");
      }
    }

    const updated = await this.projectAnalyticsRepository.updateConfig(
      projectId,
      {
        isEnabled,
        allowedDomains,
        trackingKey: trackingKey ? trackingKey.trim() : undefined,
      },
    );

    if (!updated) {
      throw new AppError("Tracking config not found.", 404, "CONFIG_NOT_FOUND");
    }

    return updated;
  }
}
