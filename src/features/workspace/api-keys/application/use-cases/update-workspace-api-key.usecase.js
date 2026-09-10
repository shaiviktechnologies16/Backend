import { AppError } from "../../../../../common/errors/AppError.js";

export class UpdateWorkspaceApiKeyUseCase {
  constructor({ workspaceApiKeyRepository, encryptionService }) {
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
    this.encryptionService = encryptionService;
  }

  async execute({
    organizationId,
    userId,
    role,
    apiKeyId,
    name,
    description,
    value,
  }) {
    if (!["OWNER", "ADMIN"].includes(role)) {
      throw new AppError(
        "You do not have permission to manage workspace API keys.",
        403,
        "API_KEY_MANAGEMENT_FORBIDDEN",
      );
    }

    const apiKey = await this.workspaceApiKeyRepository.findById(apiKeyId);

    if (!apiKey) {
      throw new AppError(
        "Workspace API key not found.",
        404,
        "API_KEY_NOT_FOUND",
      );
    }

    if (apiKey.organizationId !== organizationId) {
      throw new AppError(
        "Workspace API key not found.",
        404,
        "API_KEY_NOT_FOUND",
      );
    }

    if (name !== undefined && name !== apiKey.name) {
      const existingKeys =
        await this.workspaceApiKeyRepository.findByOrganizationId(
          organizationId,
        );

      const existing = existingKeys.find(
        (item) => item.id !== apiKeyId && item.name === name,
      );

      if (existing) {
        throw new AppError(
          "An API key with this name already exists.",
          409,
          "API_KEY_ALREADY_EXISTS",
        );
      }
    }

    let encryptedValue;

    if (value !== undefined) {
      encryptedValue = this.encryptionService.encrypt(value);
    }

    apiKey.update({
      name,
      description,
      encryptedValue,
    });

    const updated = await this.workspaceApiKeyRepository.update(apiKey);

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
