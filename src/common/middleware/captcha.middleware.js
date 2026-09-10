import { captchaService } from "../security/captcha.service.js";

export function createCaptchaMiddleware({ getPlatformConfigUseCase }) {
  return async function captchaMiddleware(req, res, next) {
    try {
      if (getPlatformConfigUseCase) {
        const configs = await getPlatformConfigUseCase.execute();
        const captchaConfig = configs.find(
          (c) => c.configKey === "CAPTCHA_PROTECTION_ENABLED",
        );

        // If CAPTCHA protection is disabled or not set to "true", skip check cleanly
        if (!captchaConfig || captchaConfig.configValue !== "true") {
          return next();
        }
      }

      const captchaToken = req.body?.captchaToken;
      const captchaInput = req.body?.captchaInput ?? req.body?.captchaCode;

      if (!captchaToken || !captchaInput) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired CAPTCHA. Please try again.",
          error: {
            message: "Invalid or expired CAPTCHA. Please try again.",
            code: "INVALID_CAPTCHA",
          },
        });
      }

      const isValid = captchaService.verifyCaptcha(captchaToken, captchaInput);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired CAPTCHA. Please try again.",
          error: {
            message: "Invalid or expired CAPTCHA. Please try again.",
            code: "INVALID_CAPTCHA",
          },
        });
      }

      return next();
    } catch (error) {
      next(error);
    }
  };
}
