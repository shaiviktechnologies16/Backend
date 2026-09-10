import { AppError } from "../../../../../common/errors/AppError.js";

export class CreatePlatformConfigUseCase {
  constructor({ platformConfigRepository, encryptionService }) {
    this.platformConfigRepository = platformConfigRepository;
    this.encryptionService = encryptionService;
  }

  async execute({
    configKey,
    configValue,
    isSecret = false,
    description = null,
  }) {
    if (!configKey?.trim()) {
      throw new AppError(
        "Configuration key is required.",
        400,
        "CONFIG_KEY_REQUIRED",
      );
    }

    if (!configValue) {
      throw new AppError(
        "Configuration value is required.",
        400,
        "CONFIG_VALUE_REQUIRED",
      );
    }

    const existing = await this.platformConfigRepository.findByKey(
      configKey.trim(),
    );

    if (existing) {
      throw new AppError(
        "Platform configuration already exists.",
        409,
        "PLATFORM_CONFIG_ALREADY_EXISTS",
      );
    }

    const storedValue = isSecret
      ? this.encryptionService.encrypt(configValue)
      : configValue;

    return this.platformConfigRepository.create({
      configKey: configKey.trim(),
      configValue: storedValue,
      isSecret,
      description,
    });
  }
}
