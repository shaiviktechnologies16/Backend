import { AppError } from "../../../../../common/errors/AppError.js";

export class GetPlatformConfigUseCase {
  constructor({ platformConfigRepository, encryptionService }) {
    this.platformConfigRepository = platformConfigRepository;
    this.encryptionService = encryptionService;
  }

  async execute() {
    const configs = await this.platformConfigRepository.findAll();

    return configs.map((config) => ({
      ...config,
      configValue: config.isSecret ? "********" : config.configValue,
    }));
  }

  async getValue(configKey) {
    const config = await this.platformConfigRepository.findByKey(configKey);

    if (!config) {
      return null;
    }

    if (config.isSecret) {
      return this.encryptionService.decrypt(config.configValue);
    }

    return config.configValue;
  }
}
