import { AppError } from "../../../../../common/errors/AppError.js";

export class UpdatePlatformConfigUseCase {
  constructor({ platformConfigRepository, encryptionService }) {
    this.platformConfigRepository = platformConfigRepository;
    this.encryptionService = encryptionService;
  }

  async execute({ configKey, configValue, isSecret, description }) {
    const existing = await this.platformConfigRepository.findByKey(configKey);

    if (!existing) {
      const finalSecretStatus = isSecret ?? false;
      let finalValue = null;

      if (
        configValue !== undefined &&
        configValue !== null &&
        configValue !== "" &&
        configValue !== "********"
      ) {
        finalValue = finalSecretStatus
          ? this.encryptionService.encrypt(configValue)
          : configValue;
      } else if (configValue === "") {
        finalValue = "";
      }

      const data = {
        configKey,
        configValue: finalValue,
        isSecret: finalSecretStatus,
        description: description ?? null,
      };
      return this.platformConfigRepository.create(data);
    }

    const data = {};

    const finalSecretStatus =
      isSecret !== undefined ? isSecret : existing.isSecret;

    if (configValue !== undefined && configValue !== "********") {
      if (configValue && finalSecretStatus) {
        data.configValue = this.encryptionService.encrypt(configValue);
      } else {
        data.configValue = configValue ?? null;
      }
    }

    if (isSecret !== undefined) {
      data.isSecret = isSecret;
    }

    if (description !== undefined) {
      data.description = description;
    }

    return this.platformConfigRepository.update(configKey, data);
  }
}
