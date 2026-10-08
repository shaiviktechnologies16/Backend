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

export class VideoSceneController {
  constructor({
    createVideoSceneUseCase,
    updateVideoSceneUseCase,
    deleteVideoSceneUseCase,
    updateSceneStatusUseCase,
    generateVideoSceneVideoUseCase = null,
    generateVideoSceneImageUseCase = null,
    generateVideoSceneStageUseCase = null,
    retryVideoSceneStageUseCase = null,
  }) {
    this.createVideoSceneUseCase = createVideoSceneUseCase;
    this.updateVideoSceneUseCase = updateVideoSceneUseCase;
    this.deleteVideoSceneUseCase = deleteVideoSceneUseCase;
    this.updateSceneStatusUseCase = updateSceneStatusUseCase;
    this.generateVideoSceneVideoUseCase = generateVideoSceneVideoUseCase;
    this.generateVideoSceneImageUseCase = generateVideoSceneImageUseCase;
    this.generateVideoSceneStageUseCase = generateVideoSceneStageUseCase;
    this.retryVideoSceneStageUseCase = retryVideoSceneStageUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");
    AiVideoValidator.validateCreateSceneInput(req.body);

    const organizationId = getOrganizationId(req);

    const {
      sceneNumber,
      duration,
      visualPrompt,
      motionPrompt,
      dialogue,
      speaker,
      characterIds,
      referenceImageUrl,
      metadata,
    } = req.body;

    const scene = await this.createVideoSceneUseCase.execute({
      organizationId,
      videoProjectId: projectId,
      sceneNumber,
      duration,
      visualPrompt,
      motionPrompt,
      dialogue,
      speaker,
      characterIds,
      referenceImageUrl,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: "Video scene created successfully.",
      data: scene,
      scene: scene,
    });
  });

  update = asyncHandler(async (req, res) => {
    const { sceneId } = req.params;
    AiVideoValidator.validateUUID(sceneId, "Scene ID");

    const organizationId = getOrganizationId(req);

    const {
      sceneNumber,
      duration,
      visualPrompt,
      motionPrompt,
      dialogue,
      speaker,
      characterIds,
      referenceImageUrl,
      metadata,
    } = req.body;

    const scene = await this.updateVideoSceneUseCase.execute({
      organizationId,
      sceneId,
      sceneNumber,
      duration,
      visualPrompt,
      motionPrompt,
      dialogue,
      speaker,
      characterIds,
      referenceImageUrl,
      metadata,
    });

    return res.json({
      success: true,
      message: "Video scene updated successfully.",
      data: scene,
      scene: scene,
    });
  });

  delete = asyncHandler(async (req, res) => {
    const { sceneId } = req.params;
    AiVideoValidator.validateUUID(sceneId, "Scene ID");

    const organizationId = getOrganizationId(req);

    await this.deleteVideoSceneUseCase.execute({
      organizationId,
      sceneId,
    });

    return res.json({
      success: true,
      message: "Video scene deleted successfully.",
    });
  });

  updateStatus = asyncHandler(async (req, res) => {
    const { sceneId } = req.params;
    AiVideoValidator.validateUUID(sceneId, "Scene ID");
    AiVideoValidator.validateUpdateSceneStatusInput(req.body);

    const organizationId = getOrganizationId(req);

    const { status, referenceImageUrl, videoUrl, audioUrl, errorMessage, metadata } = req.body;

    const scene = await this.updateSceneStatusUseCase.execute({
      organizationId,
      sceneId,
      status,
      referenceImageUrl,
      videoUrl,
      audioUrl,
      errorMessage,
      metadata,
    });

    return res.json({
      success: true,
      message: "Scene status updated successfully.",
      data: scene,
      scene: scene,
    });
  });

  generateImage = asyncHandler(async (req, res) => {
    const { projectId, sceneNumber, sceneId } = req.params;
    if (projectId) {
      AiVideoValidator.validateUUID(projectId, "Project ID");
    }
    const organizationId = getOrganizationId(req);
    const { forceRegenerate = false, options = {} } = req.body || {};

    if (!this.generateVideoSceneImageUseCase) {
      throw new AppError(
        "Scene image generation use case not configured",
        500,
        "IMAGE_USECASE_UNAVAILABLE",
      );
    }

    const result = await this.generateVideoSceneImageUseCase.execute({
      organizationId,
      projectId,
      sceneNumber:
        sceneNumber !== undefined && sceneNumber !== null
          ? Number(sceneNumber)
          : null,
      sceneId: sceneId || null,
      forceRegenerate: Boolean(forceRegenerate),
      options,
    });

    const scene = result.scene;
    return res.json({
      success: true,
      scene: {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        imageUrl: result.imageUrl || scene.referenceImageUrl,
        imageStatus:
          result.imageStatus ||
          (scene.status === "READY" || scene.status === "IMAGE_READY"
            ? "READY"
            : scene.status),
        referenceImageUrl: result.imageUrl || scene.referenceImageUrl,
        status: scene.status,
      },
      reused: Boolean(result.reused),
    });
  });

  generateAllImages = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");
    const organizationId = getOrganizationId(req);
    const { forceRegenerate = false, options = {} } = req.body || {};

    if (!this.generateVideoSceneImageUseCase) {
      throw new AppError(
        "Scene image generation use case not configured",
        500,
        "IMAGE_USECASE_UNAVAILABLE",
      );
    }

    const result = await this.generateVideoSceneImageUseCase.executeBatch({
      organizationId,
      projectId,
      forceRegenerate: Boolean(forceRegenerate),
      concurrency: 2,
      options,
    });

    return res.json({
      success: true,
      message: "Scene images generated successfully",
      ...result,
    });
  });

  generateVideo = asyncHandler(async (req, res) => {
    const { projectId, sceneNumber, sceneId } = req.params;
    if (projectId) {
      AiVideoValidator.validateUUID(projectId, "Project ID");
    }
    const organizationId = getOrganizationId(req);
    const { forceRegenerate = false, options = {}, isSync = false } = req.body || {};

    if (!this.generateVideoSceneVideoUseCase) {
      throw new AppError(
        "Scene video generation use case not configured",
        500,
        "VIDEO_USECASE_UNAVAILABLE",
      );
    }

    const result = await this.generateVideoSceneVideoUseCase.execute({
      organizationId,
      projectId,
      sceneNumber:
        sceneNumber !== undefined && sceneNumber !== null
          ? Number(sceneNumber)
          : null,
      sceneId: sceneId || null,
      forceRegenerate: Boolean(forceRegenerate),
      isSync: Boolean(isSync),
      options,
    });

    const scene = result.scene;
    return res.json({
      success: true,
      status: result.status || (scene?.videoUrl ? "READY" : "GENERATING"),
      jobId: result.jobId || null,
      videoUrl: result.videoUrl || scene?.videoUrl || null,
      scene: {
        id: scene?.id,
        sceneNumber: scene?.sceneNumber,
        videoUrl: result.videoUrl || scene?.videoUrl || null,
        status: scene?.status || result.status,
        referenceImageUrl: scene?.referenceImageUrl,
      },
      reused: Boolean(result.reused),
    });
  });

  generateAllVideos = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");
    const organizationId = getOrganizationId(req);
    const { forceRegenerate = false, options = {} } = req.body || {};

    if (!this.generateVideoSceneVideoUseCase) {
      throw new AppError(
        "Scene video generation use case not configured",
        500,
        "VIDEO_USECASE_UNAVAILABLE",
      );
    }

    const result = await this.generateVideoSceneVideoUseCase.executeBatch({
      organizationId,
      projectId,
      forceRegenerate: Boolean(forceRegenerate),
      options,
    });

    return res.json({
      success: true,
      message: "Scene video generation started successfully",
      ...result,
    });
  });

  executeStage = asyncHandler(async (req, res) => {
    const { projectId, sceneId, stage } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");
    AiVideoValidator.validateUUID(sceneId, "Scene ID");
    const organizationId = getOrganizationId(req);
    const { forceRegenerate = false, providerName, options = {} } =
      req.body || {};

    if (!this.generateVideoSceneStageUseCase) {
      throw new AppError(
        "Stage execution use case not configured",
        500,
        "STAGE_EXECUTION_UNAVAILABLE",
      );
    }

    const result = await this.generateVideoSceneStageUseCase.execute({
      organizationId,
      projectId,
      sceneId,
      stage,
      forceRegenerate: Boolean(forceRegenerate),
      options: { ...options, providerName },
    });

    return res.json({
      success: true,
      result,
    });
  });

  retryStage = asyncHandler(async (req, res) => {
    const { projectId, sceneId, stage } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");
    AiVideoValidator.validateUUID(sceneId, "Scene ID");
    const organizationId = getOrganizationId(req);
    const { providerName, options = {} } = req.body || {};

    if (!this.retryVideoSceneStageUseCase) {
      throw new AppError(
        "Retry stage use case not configured",
        500,
        "STAGE_RETRY_UNAVAILABLE",
      );
    }

    const result = await this.retryVideoSceneStageUseCase.execute({
      organizationId,
      projectId,
      sceneId,
      stage,
      options: { ...options, providerName },
    });

    return res.json({
      success: true,
      result,
    });
  });
}
