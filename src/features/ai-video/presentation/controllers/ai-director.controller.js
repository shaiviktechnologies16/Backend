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

export class AiDirectorController {
  constructor({
    generateVideoScriptUseCase,
    generateVideoStoryboardUseCase,
    calculateVideoProjectProgressUseCase,
  }) {
    this.generateVideoScriptUseCase = generateVideoScriptUseCase;
    this.generateVideoStoryboardUseCase = generateVideoStoryboardUseCase;
    this.calculateVideoProjectProgressUseCase = calculateVideoProjectProgressUseCase;
  }

  generateScript = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");

    const organizationId = getOrganizationId(req);
    const { topicPrompt, targetDuration, language, style, forceRegenerate = false, isSync = false } = req.body || {};

    if (isSync) {
      const result = await this.generateVideoScriptUseCase.execute({
        organizationId,
        projectId,
        topicPrompt,
        targetDuration,
        language,
        style,
        forceRegenerate,
      });

      return res.json({
        success: true,
        message: "Video script generated successfully.",
        data: result,
        script: result?.script || null,
        project: result?.project || null,
        status: result?.project?.status || "READY",
      });
    }

    // Default: Asynchronous Background Generation
    const bgPromise = (async () => {
      try {
        await this.generateVideoScriptUseCase.execute({
          organizationId,
          projectId,
          topicPrompt,
          targetDuration,
          language,
          style,
          forceRegenerate,
        });
      } catch (err) {
        console.error("[AI_DIRECTOR_BG_SCRIPT_ERROR]", {
          projectId,
          organizationId,
          error: err.message,
          code: err.errorCode || err.code,
        });
      }
    })();
    bgPromise.catch((err) => console.error("[AI_DIRECTOR_BG_SCRIPT_UNHANDLED]", err));

    return res.json({
      success: true,
      message: "AI Director script generation started in background.",
      data: { status: "GENERATING" },
      status: "GENERATING",
    });
  });

  generateStoryboard = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");

    const organizationId = getOrganizationId(req);
    const createdById = getUserId(req);

    const { scriptText, topicPrompt, targetDuration, aspectRatio, language, style, forceRegenerate = false, isSync = false } = req.body || {};

    if (isSync) {
      const result = await this.generateVideoStoryboardUseCase.execute({
        organizationId,
        createdById,
        projectId,
        scriptText,
        topicPrompt,
        targetDuration,
        aspectRatio,
        language,
        style,
        forceRegenerate,
      });

      return res.json({
        success: true,
        message: "Video storyboard generated successfully.",
        data: result,
        storyboard: result?.storyboard || null,
        scenes: result?.scenes || [],
        project: result?.project || null,
        status: result?.project?.status || "READY",
      });
    }

    // Default: Asynchronous Background Generation
    const bgPromise = (async () => {
      try {
        await this.generateVideoStoryboardUseCase.execute({
          organizationId,
          createdById,
          projectId,
          scriptText,
          topicPrompt,
          targetDuration,
          aspectRatio,
          language,
          style,
          forceRegenerate,
        });
      } catch (err) {
        console.error("[AI_DIRECTOR_BG_STORYBOARD_ERROR]", {
          projectId,
          organizationId,
          error: err.message,
          code: err.errorCode || err.code,
        });
      }
    })();
    bgPromise.catch((err) => console.error("[AI_DIRECTOR_BG_STORYBOARD_UNHANDLED]", err));

    return res.json({
      success: true,
      message: "AI Director storyboard generation started in background.",
      data: { status: "GENERATING" },
      status: "GENERATING",
    });
  });

  getProgress = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    AiVideoValidator.validateUUID(projectId, "Project ID");

    const organizationId = getOrganizationId(req);

    const result = await this.calculateVideoProjectProgressUseCase.execute({
      organizationId,
      projectId,
    });

    return res.json({
      success: true,
      data: result,
      progress: result,
    });
  });
}
