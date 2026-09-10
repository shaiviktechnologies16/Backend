export class PublicConfigController {
  constructor({ getPlatformConfigUseCase }) {
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  async get(req, res, next) {
    try {
      const configs = await this.getPlatformConfigUseCase.execute();

      const allowedKeys = [
        "PLATFORM_NAME",
        "PLATFORM_LOGO",
        "PLATFORM_FAVICON",
        "PLATFORM_DESCRIPTION",
        "PLATFORM_PRIMARY_COLOR",
        "PLATFORM_SECONDARY_COLOR",
        "CAPTCHA_PROTECTION_ENABLED",
      ];

      const data = {};

      configs.forEach((config) => {
        if (allowedKeys.includes(config.configKey)) {
          data[config.configKey] = config.configValue;
        }
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
