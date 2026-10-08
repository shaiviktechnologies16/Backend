import { AppError } from "../../../../../common/errors/AppError.js";

export class GetPlatformConfigUseCase {
  constructor({ platformConfigRepository, encryptionService }) {
    this.platformConfigRepository = platformConfigRepository;
    this.encryptionService = encryptionService;
    this.cache = new Map();
    this.cacheTtlMs = 60_000;
  }

  invalidateCache(configKey = null) {
    if (configKey) {
      this.cache.delete(configKey);
    } else {
      this.cache.clear();
    }
  }

  async execute() {
    const configs = await this.platformConfigRepository.findAll();

    return configs.map((config) => ({
      ...config,
      configValue: config.isSecret ? "********" : config.configValue,
    }));
  }

  async getValue(configKey) {
    const cached = this.cache.get(configKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.value;
    }

    const config = await this.platformConfigRepository.findByKey(configKey);

    if (!config) {
      this.cache.set(configKey, { value: null, timestamp: Date.now() });
      return null;
    }

    let val = config.configValue;

    if (config.isSecret) {
      if (!config.configValue) {
        val = null;
      } else {
        try {
          val = this.encryptionService.decrypt(config.configValue);
        } catch (err) {
          console.warn(
            `[CONFIG DECRYPTION WARN] Could not decrypt secret config "${configKey}", using raw value. Error: ${err.message}`,
          );
          val = config.configValue;
        }
      }
    }

    this.cache.set(configKey, { value: val, timestamp: Date.now() });
    return val;
  }
}
