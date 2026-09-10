import {
  createPlatformApiKeySchema,
  updatePlatformApiKeySchema,
} from "../validators/platform-api-key.validator.js";

export class PlatformApiKeyController {
  constructor(
    createPlatformApiKeyUseCase,
    getPlatformApiKeysUseCase,
    updatePlatformApiKeyUseCase,
    deletePlatformApiKeyUseCase,
  ) {
    this.createPlatformApiKeyUseCase = createPlatformApiKeyUseCase;
    this.getPlatformApiKeysUseCase = getPlatformApiKeysUseCase;
    this.updatePlatformApiKeyUseCase = updatePlatformApiKeyUseCase;
    this.deletePlatformApiKeyUseCase = deletePlatformApiKeyUseCase;
  }

  getAll = async (req, res, next) => {
    try {
      const result = await this.getPlatformApiKeysUseCase.execute();

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const { error, value } = createPlatformApiKeySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.details.map((detail) => detail.message).join(", "),
          },
        });
      }

      const result = await this.createPlatformApiKeyUseCase.execute({
        ...value,
        createdBy: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Platform API key created successfully.",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };
  update = async (req, res, next) => {
    try {
      const { error, value } = updatePlatformApiKeySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.details.map((detail) => detail.message).join(", "),
          },
        });
      }

      const result = await this.updatePlatformApiKeyUseCase.execute({
        id: req.params.id,
        ...value,
      });

      return res.status(200).json({
        success: true,
        message: "Platform API key updated successfully.",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const result = await this.deletePlatformApiKeyUseCase.execute(
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        message: "Platform API key deleted successfully.",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };
}
