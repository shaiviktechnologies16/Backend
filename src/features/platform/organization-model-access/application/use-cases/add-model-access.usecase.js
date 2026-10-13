import { AppError } from "../../../../../common/errors/AppError.js";

export class AddModelAccessUseCase {
  constructor({
    organizationModelAccessRepository,
    organizationRepository = null,
    aiModelRepository = null,
    onModelAccessChanged = null,
  }) {
    this.organizationModelAccessRepository = organizationModelAccessRepository;
    this.organizationRepository = organizationRepository;
    this.aiModelRepository = aiModelRepository;
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

    if (this.organizationRepository) {
      const org = await this.organizationRepository.findById(organizationId);
      if (!org) {
        throw new AppError(
          "Organization not found.",
          404,
          "ORGANIZATION_NOT_FOUND",
        );
      }
    }

    if (this.aiModelRepository) {
      const model = await this.aiModelRepository.findById(aiModelId);
      if (!model) {
        throw new AppError("AI model not found.", 404, "AI_MODEL_NOT_FOUND");
      }
      if (model.status !== "ACTIVE") {
        throw new AppError(
          "AI model is not active and cannot be assigned.",
          400,
          "AI_MODEL_INACTIVE",
        );
      }
      if (model.capability && model.capability !== "CHAT") {
        throw new AppError(
          "Only chat models can be assigned to organization model access.",
          400,
          "INVALID_MODEL_CAPABILITY",
        );
      }
    }

    const existing = await this.organizationModelAccessRepository.findOne(
      organizationId,
      aiModelId,
    );

    if (existing) {
      if (this.onModelAccessChanged) {
        try {
          await this.onModelAccessChanged(organizationId, aiModelId);
        } catch (err) {
          console.error("Failed to invalidate model access cache on assign:", err);
        }
      }
      return existing;
    }

    const created = await this.organizationModelAccessRepository.create({
      organizationId,
      aiModelId,
    });

    if (this.onModelAccessChanged) {
      try {
        await this.onModelAccessChanged(organizationId, aiModelId);
      } catch (err) {
        console.error("Failed to invalidate model access cache on assign:", err);
      }
    }

    return created;
  }
}
