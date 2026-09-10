import { AppError } from "../../../../../common/errors/AppError.js";
import { PlatformApiKey } from "../../domain/entities/platform-api-key.entity.js";

export class CreatePlatformApiKeyUseCase {
  constructor({ platformApiKeyRepository, encryptionService }) {
    this.platformApiKeyRepository = platformApiKeyRepository;
    this.encryptionService = encryptionService;
  }

  async execute({ provider, name, description, value, createdBy }) {
    const normalizedProvider = provider?.trim().toLowerCase();
    const normalizedName = name?.trim();

    if (!normalizedProvider) {
      throw new AppError("Provider is required.", 400, "PROVIDER_REQUIRED");
    }

    if (!normalizedName) {
      throw new AppError("Name is required.", 400, "NAME_REQUIRED");
    }

    if (!value) {
      throw new AppError(
        "API key value is required.",
        400,
        "API_KEY_VALUE_REQUIRED",
      );
    }

    const existingKeys =
      await this.platformApiKeyRepository.findByProvider(normalizedProvider);

    const existing = existingKeys.find(
      (apiKey) => apiKey.name === normalizedName,
    );

    if (existing) {
      throw new AppError(
        "An API key with this provider and name already exists.",
        409,
        "API_KEY_ALREADY_EXISTS",
      );
    }

    const encryptedValue = this.encryptionService.encrypt(value);

    const apiKey = new PlatformApiKey({
      provider: normalizedProvider,
      name: normalizedName,
      description: description?.trim() || null,
      encryptedValue,
      isActive: true,
      createdBy,
    });

    const created = await this.platformApiKeyRepository.create(apiKey);

    return {
      id: created.id,
      provider: created.provider,
      name: created.name,
      description: created.description,
      isActive: created.isActive,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }
}
