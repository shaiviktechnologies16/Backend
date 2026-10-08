import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ValidationError } from "../../../../common/errors/ValidationError.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { AiVideoValidator } from "../validators/ai-video.validator.js";

function getOrganizationId(req) {
  const orgId =
    req.context?.organization?.id ||
    req.context?.organizationId ||
    req.user?.organizationId ||
    null;

  if (!orgId) {
    const err = new ValidationError(
      "Organization context is required. Please select an organization.",
    );
    err.errorCode = "ORGANIZATION_CONTEXT_REQUIRED";
    throw err;
  }

  return orgId;
}

function getUserId(req) {
  const userId = req.user?.id || req.context?.user?.id || null;
  if (!userId) {
    throw new ValidationError("User authentication context is required.");
  }
  return userId;
}

export class VideoProjectController {
  constructor({
    createVideoProjectUseCase,
    getVideoProjectUseCase,
    listVideoProjectsUseCase,
    deleteVideoProjectUseCase,
  }) {
    this.createVideoProjectUseCase = createVideoProjectUseCase;
    this.getVideoProjectUseCase = getVideoProjectUseCase;
    this.listVideoProjectsUseCase = listVideoProjectsUseCase;
    this.deleteVideoProjectUseCase = deleteVideoProjectUseCase;
  }

  create = asyncHandler(async (req, res) => {
    AiVideoValidator.validateCreateProjectInput(req.body);

    const organizationId = getOrganizationId(req);
    const createdById = getUserId(req);

    const { name, prompt, language, aspectRatio, duration, style, projectId, metadata } = req.body;

    const project = await this.createVideoProjectUseCase.execute({
      organizationId,
      createdById,
      name,
      prompt,
      language,
      aspectRatio,
      duration,
      style,
      projectId,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: "Video project created successfully.",
      data: project,
      project: project,
    });
  });

  get = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");

    const organizationId = getOrganizationId(req);

    const result = await this.getVideoProjectUseCase.execute({
      organizationId,
      projectId,
    });

    return res.json({
      success: true,
      data: result,
      project: result.project,
      scenes: result.scenes,
    });
  });

  list = asyncHandler(async (req, res) => {
    AiVideoValidator.validatePaginationInput(req.query);
    const organizationId = getOrganizationId(req);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await this.listVideoProjectsUseCase.execute({
      organizationId,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.projects,
      projects: result.projects,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  });

  delete = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");

    const organizationId = getOrganizationId(req);

    await this.deleteVideoProjectUseCase.execute({
      organizationId,
      projectId,
    });

    return res.json({
      success: true,
      message: "Video project deleted successfully.",
    });
  });
}
