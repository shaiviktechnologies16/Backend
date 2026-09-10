import envConfig from "../../config/env.config.js";

export const organizationKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-organization-key"];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      code: "ORGANIZATION_KEY_REQUIRED",
      message: "Organization key is required.",
    });
  }

  if (apiKey !== envConfig.security.organizationApiKey) {
    return res.status(401).json({
      success: false,
      code: "INVALID_ORGANIZATION_KEY",
      message: "Invalid organization key.",
    });
  }

  next();
};
