import { AppError } from "../../../../../common/errors/AppError.js";

export class UpdatePlatformBrandingUseCase {
  constructor({ platformConfigRepository }) {
    this.platformConfigRepository = platformConfigRepository;
  }

  async execute({
    name,
    description,
    logo,
    favicon,
    primaryColor,
    secondaryColor,
  }) {
    const configs = {
      PLATFORM_NAME: name,
      PLATFORM_DESCRIPTION: description,
      PLATFORM_LOGO: logo,
      PLATFORM_FAVICON: favicon,
      PLATFORM_PRIMARY_COLOR: primaryColor,
      PLATFORM_SECONDARY_COLOR: secondaryColor,
    };

    for (const [configKey, configValue] of Object.entries(configs)) {
      if (configValue === undefined) {
        continue;
      }

      const existing = await this.platformConfigRepository.findByKey(configKey);

      if (!existing) {
        throw new AppError(
          `${configKey} configuration not found.`,
          404,
          "PLATFORM_CONFIG_NOT_FOUND",
        );
      }

      await this.platformConfigRepository.update(configKey, {
        configValue,
      });
    }

    return {
      success: true,
      message: "Platform branding updated successfully.",
    };
  }
}
