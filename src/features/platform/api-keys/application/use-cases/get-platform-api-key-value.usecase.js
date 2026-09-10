import { AppError } from "../../../../../common/errors/AppError.js";

export class GetPlatformApiKeyValueUseCase {
  constructor({ platformApiKeyRepository, encryptionService }) {
    this.platformApiKeyRepository = platformApiKeyRepository;
    this.encryptionService = encryptionService;
  }

  async execute(provider) {
    const apiKeys =
      await this.platformApiKeyRepository.findByProvider(provider);

    const activeApiKey = apiKeys.find((apiKey) => apiKey.isActive);

    if (!activeApiKey) {
      throw new AppError(
        `No active API key configured for provider: ${provider}.`,
        404,
        "PLATFORM_API_KEY_NOT_FOUND",
      );
    }

    return this.encryptionService.decrypt(activeApiKey.encryptedValue);
  }
}
