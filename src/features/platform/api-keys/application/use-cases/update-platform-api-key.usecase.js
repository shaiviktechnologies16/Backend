import { AppError } from "../../../../../common/errors/AppError.js";

export class UpdatePlatformApiKeyUseCase {
  constructor({ platformApiKeyRepository, encryptionService }) {
    this.platformApiKeyRepository = platformApiKeyRepository;
    this.encryptionService = encryptionService;
  }

  async execute({ id, provider, name, description, value, isActive }) {
    const apiKey = await this.platformApiKeyRepository.findById(id);

    if (!apiKey) {
      throw new AppError(
        "Platform API key not found.",
        404,
        "PLATFORM_API_KEY_NOT_FOUND",
      );
    }

    const normalizedProvider =
      provider?.trim().toLowerCase() ?? apiKey.provider;

    const normalizedName = name?.trim() ?? apiKey.name;

    if (!normalizedProvider) {
      throw new AppError("Provider is required.", 400, "PROVIDER_REQUIRED");
    }

    if (!normalizedName) {
      throw new AppError("Name is required.", 400, "NAME_REQUIRED");
    }

    const existingKeys =
      await this.platformApiKeyRepository.findByProvider(normalizedProvider);

    const duplicate = existingKeys.find(
      (item) => item.id !== id && item.name === normalizedName,
    );

    if (duplicate) {
      throw new AppError(
        "An API key with this provider and name already exists.",
        409,
        "API_KEY_ALREADY_EXISTS",
      );
    }

    apiKey.provider = normalizedProvider;
    apiKey.name = normalizedName;

    if (description !== undefined) {
      apiKey.description = description?.trim() || null;
    }

    if (value !== undefined && value !== "") {
      apiKey.encryptedValue = this.encryptionService.encrypt(value);
    }

    if (isActive !== undefined) {
      apiKey.isActive = isActive;
    }

    const updated = await this.platformApiKeyRepository.update(apiKey);

    if (!updated) {
      throw new AppError(
        "Platform API key not found.",
        404,
        "PLATFORM_API_KEY_NOT_FOUND",
      );
    }

    return {
      id: updated.id,
      provider: updated.provider,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
