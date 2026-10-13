import { AppError } from "../../../../../common/errors/AppError.js";

export class RemoveModelAccessUseCase {
  constructor({
    organizationModelAccessRepository,
    onModelAccessChanged = null,
  }) {
    this.organizationModelAccessRepository = organizationModelAccessRepository;
    this.onModelAccessChanged = onModelAccessChanged;
  }

  async execute({ organizationId, aiModelId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!aiModelId) {
      throw new AppError(
        "AI model ID is required.",
        400,
        "AI_MODEL_ID_REQUIRED",
      );
    }

    await this.organizationModelAccessRepository.delete(
      organizationId,
      aiModelId,
    );

    if (this.onModelAccessChanged) {
      try {
        await this.onModelAccessChanged(organizationId, aiModelId);
      } catch (err) {
        console.error("Failed to invalidate model access cache on remove:", err);
      }
    }
  }
}
