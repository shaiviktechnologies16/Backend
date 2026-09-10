import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";
import {
  createWorkspaceApiKeySchema,
  updateWorkspaceApiKeySchema,
} from "../validators/workspace-api-key.validator.js";

export class WorkspaceApiKeyController {
  constructor({
    createWorkspaceApiKeyUseCase,
    getWorkspaceApiKeysUseCase,
    updateWorkspaceApiKeyUseCase,
    deleteWorkspaceApiKeyUseCase,
  }) {
    this.createWorkspaceApiKeyUseCase = createWorkspaceApiKeyUseCase;
    this.getWorkspaceApiKeysUseCase = getWorkspaceApiKeysUseCase;
    this.updateWorkspaceApiKeyUseCase = updateWorkspaceApiKeyUseCase;
    this.deleteWorkspaceApiKeyUseCase = deleteWorkspaceApiKeyUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const { error, value } = createWorkspaceApiKeySchema.validate(req.body, {
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

    const result = await this.createWorkspaceApiKeyUseCase.execute({
      organizationId: req.context.organization.id,
      userId: req.user.id,
      role: req.context.membership.role,
      ...value,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const result = await this.getWorkspaceApiKeysUseCase.execute(
      req.context.organization.id,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  });

  update = asyncHandler(async (req, res) => {
    const { error, value } = updateWorkspaceApiKeySchema.validate(req.body, {
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

    const result = await this.updateWorkspaceApiKeyUseCase.execute({
      organizationId: req.context.organization.id,
      userId: req.user.id,
      role: req.context.membership.role,
      apiKeyId: req.params.apiKeyId,
      ...value,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  });

  delete = asyncHandler(async (req, res) => {
    await this.deleteWorkspaceApiKeyUseCase.execute({
      organizationId: req.context.organization.id,
      role: req.context.membership.role,
      apiKeyId: req.params.apiKeyId,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace API key deleted successfully.",
    });
  });
}
