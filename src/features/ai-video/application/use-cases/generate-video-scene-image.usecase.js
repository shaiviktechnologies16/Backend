import { AppError } from "../../../../common/errors/AppError.js";
import { VideoImagePromptBuilder } from "../../domain/services/video-image-prompt.builder.js";
import {
  AI_VIDEO_SCENE_STATUS,
  AI_VIDEO_PROJECT_STATUS,
} from "../../domain/constants/ai-video.constants.js";

/**
 * Use case for generating an AI image for a specific video storyboard scene,
 * or batch generating images for all scenes in a project.
 */
export class GenerateVideoSceneImageUseCase {
  constructor({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository = null,
    videoAssetRepository = null,
    videoProviderFactory,
    calculateVideoProjectProgressUseCase = null,
  }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
    this.videoCharacterRepository = videoCharacterRepository;
    this.videoAssetRepository = videoAssetRepository;
    this.videoProviderFactory = videoProviderFactory;
    this.calculateVideoProjectProgressUseCase = calculateVideoProjectProgressUseCase;
  }

  /**
   * Sanitizes error message to remove potential API keys or authorization headers.
   */
  sanitizeErrorMessage(message) {
    if (!message || typeof message !== "string") {
      return "Image generation failed";
    }
    return message
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
      .replace(/sk-[A-Za-z0-9_-]{10,}/gi, "sk-[REDACTED]")
      .replace(/key=[A-Za-z0-9._-]+/gi, "key=[REDACTED]");
  }

  /**
   * Generates an image for a single scene in a video project.
   */
  async execute({
    organizationId,
    projectId,
    sceneNumber = null,
    sceneId = null,
    forceRegenerate = false,
    options = {},
  }) {
    // 1. Validate inputs
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    if (
      (sceneNumber === null || sceneNumber === undefined || sceneNumber === "") &&
      !sceneId
    ) {
      throw new AppError(
        "Scene number or scene ID is required",
        400,
        "MISSING_SCENE_IDENTIFIER",
      );
    }

    // 2. Retrieve project
    const project = await this.videoProjectRepository.findByIdForOrganization(
      projectId,
      organizationId,
    );
    if (!project) {
      throw new AppError(
        "Video project not found or unauthorized",
        404,
        "AI_VIDEO_PROJECT_NOT_FOUND",
      );
    }

    // 3. Ensure storyboard exists
    const hasStoryboardScenes =
      project.storyboard &&
      Array.isArray(project.storyboard.scenes) &&
      project.storyboard.scenes.length > 0;

    let existingScenes = [];
    if (this.videoSceneRepository) {
      existingScenes = await this.videoSceneRepository.findByProjectId(projectId);
    }

    if (!hasStoryboardScenes && (!existingScenes || existingScenes.length === 0)) {
      throw new AppError(
        "Storyboard is required before generating images",
        400,
        "AI_DIRECTOR_STORYBOARD_REQUIRED",
      );
    }

    // 4. Resolve target scene
    let scene = null;
    if (sceneId) {
      scene =
        existingScenes.find((s) => s.id === sceneId) ||
        (await this.videoSceneRepository?.findById(sceneId));
      if (scene && scene.videoProjectId !== projectId) {
        scene = null;
      }
    } else if (sceneNumber !== null && sceneNumber !== undefined) {
      scene = existingScenes.find(
        (s) => Number(s.sceneNumber) === Number(sceneNumber),
      );
    }

    // Fallback: If scene record was not in repository but is defined in project.storyboard
    if (!scene && hasStoryboardScenes) {
      const sbScene = project.storyboard.scenes.find((s) => {
        if (sceneId && s.id === sceneId) return true;
        if (sceneNumber !== null && sceneNumber !== undefined) {
          return Number(s.sceneNumber) === Number(sceneNumber);
        }
        return false;
      });

      if (sbScene && this.videoSceneRepository) {
        scene = await this.videoSceneRepository.create({
          videoProjectId: projectId,
          sceneNumber: sbScene.sceneNumber || Number(sceneNumber) || 1,
          duration: sbScene.duration || 5,
          visualPrompt: sbScene.visualPrompt || "",
          motionPrompt: sbScene.motionPrompt || "",
          dialogue: sbScene.dialogue || "",
          speaker: sbScene.speaker || "Narrator",
          characterIds: [],
          status: AI_VIDEO_SCENE_STATUS.PENDING,
        });
      }
    }

    if (!scene) {
      throw new AppError(
        `Scene ${sceneNumber ?? sceneId} not found`,
        404,
        "AI_VIDEO_SCENE_NOT_FOUND",
      );
    }

    // 5. Ensure scene has a visual prompt
    const visualPrompt = (scene.visualPrompt || "").trim();
    if (!visualPrompt) {
      throw new AppError(
        "Visual prompt is required for scene image generation",
        400,
        "AI_IMAGE_PROMPT_REQUIRED",
      );
    }

    // 6. Idempotency check: If scene already has an image and forceRegenerate is false
    if (
      !forceRegenerate &&
      scene.referenceImageUrl &&
      scene.status !== AI_VIDEO_SCENE_STATUS.FAILED
    ) {
      return {
        success: true,
        scene,
        imageUrl: scene.referenceImageUrl,
        imageStatus: "READY",
        reused: true,
      };
    }

    // 7. Resolve Characters
    const characters = [];

    if (scene.characterIds?.length > 0 && this.videoCharacterRepository) {
      for (const charId of scene.characterIds) {
        try {
          const char = await this.videoCharacterRepository.findById(charId);
          if (char) {
            if (char.organizationId !== project.organizationId) {
              throw new AppError(
                "Character reference unavailable or unauthorized",
                403,
                "REFERENCE_IMAGE_UNAVAILABLE",
              );
            }
            characters.push(char);
          }
        } catch (charErr) {
          if (charErr instanceof AppError) throw charErr;
        }
      }
    }

    // Fallback: If no characters resolved yet, check if scene speaker/prompt matches any organization character
    if (characters.length === 0 && this.videoCharacterRepository?.findAllByOrganization) {
      try {
        const orgChars = await this.videoCharacterRepository.findAllByOrganization(
          project.organizationId,
          { limit: 100 },
        );
        const candidateList = orgChars?.characters || [];
        for (const char of candidateList) {
          const charNameLower = (char.name || "").toLowerCase().trim();
          if (!charNameLower) continue;

          const isSpeaker = (scene.speaker || "").toLowerCase().trim() === charNameLower;
          const mentionsInVisual = (scene.visualPrompt || "").toLowerCase().includes(charNameLower);
          const mentionsInDialogue = (scene.dialogue || "").toLowerCase().includes(charNameLower);

          if (isSpeaker || mentionsInVisual || mentionsInDialogue) {
            if (!characters.some(c => c.id === char.id)) {
              characters.push(char);
            }
          }
        }
      } catch (matchErr) {
        // Fallback gracefully
      }
    }

    // Collect all character reference images
    const referenceImages = [];
    for (const char of characters) {
      if (char.referenceImageUrl) {
        referenceImages.push({
          characterId: char.id,
          characterName: char.name,
          url: char.referenceImageUrl,
        });
      }
    }

    const primaryReferenceImageUrl = referenceImages[0]?.url || scene.referenceImageUrl || null;

    // Structured, non-sensitive logging
    console.log("[AI VIDEO][SCENE IMAGE][CHARACTERS]", {
      projectId: project.id,
      sceneId: scene.id,
      characterCount: characters.length,
    });

    for (const char of characters) {
      console.log("[AI VIDEO][SCENE IMAGE][REFERENCE]", {
        projectId: project.id,
        sceneId: scene.id,
        characterId: char.id,
        characterName: char.name,
        hasReferenceImage: Boolean(char.referenceImageUrl),
      });
    }

    // 8. Resolve Image Provider
    let provider = null;
    try {
      provider = this.videoProviderFactory.getImageProvider(
        options.providerName || "default",
      );
    } catch (pErr) {
      throw new AppError(
        "Image generation provider is not configured",
        400,
        "AI_IMAGE_PROVIDER_NOT_CONFIGURED",
      );
    }

    if (!provider) {
      throw new AppError(
        "Image generation provider is not configured",
        400,
        "AI_IMAGE_PROVIDER_NOT_CONFIGURED",
      );
    }

    // 9. Mark scene status as IMAGE_GENERATING
    const previousReferenceImageUrl = scene.referenceImageUrl;
    await this.videoSceneRepository.updateStatus(
      scene.id,
      AI_VIDEO_SCENE_STATUS.IMAGE_GENERATING,
    );

    // 10. Call provider to generate image
    try {
      const constructedPrompt = VideoImagePromptBuilder.buildPrompt({
        visualPrompt,
        projectPrompt: project.prompt || "",
        projectName: project.name || "",
        style: project.style || "3d-cartoon",
        aspectRatio: project.aspectRatio || "9:16",
        characters,
        referenceImageUrl: primaryReferenceImageUrl,
        referenceImages,
      });

      console.log("[AI VIDEO][SCENE IMAGE][PROVIDER]", {
        projectId: project.id,
        sceneId: scene.id,
        provider: provider.name,
        model: options.model || provider.defaultModel || "dall-e-3",
        referenceImageCount: referenceImages.length,
      });

      const res = await provider.generateImage({
        prompt: constructedPrompt,
        referenceImageUrl: primaryReferenceImageUrl,
        referenceImages,
        aspectRatio: project.aspectRatio,
        style: project.style,
        characters,
        organizationId: project.organizationId,
        projectId: project.id,
        options,
      });

      const assetUrl = res?.assetUrl || res?.imageUrl;
      if (!res || res.status === "FAILED" || !assetUrl) {
        throw new AppError(
          res?.error || "Image generation returned empty response",
          500,
          "AI_IMAGE_INVALID_RESPONSE",
        );
      }

      // 11. On success: Persist image URL, set status to READY
      const updatedScene = await this.videoSceneRepository.updateStatus(
        scene.id,
        "READY",
        {
          referenceImageUrl: assetUrl,
          errorMessage: null,
          metadata: {
            ...(scene.metadata || {}),
            imageProviderRes: {
              provider: res.provider,
              status: res.status,
              providerJobId: res.providerJobId,
              metadata: res.metadata,
            },
          },
        },
      );

      // Persist image asset if asset repository is available
      if (this.videoAssetRepository) {
        try {
          await this.videoAssetRepository.create({
            organizationId: project.organizationId,
            videoProjectId: project.id,
            sceneId: scene.id,
            type: "IMAGE",
            provider: res.provider,
            url: assetUrl,
            metadata: res.metadata,
          });
        } catch (assetErr) {
          console.error("[VIDEO_ASSET_PERSIST_ERROR]", assetErr);
        }
      }

      // Update project storyboard scene metadata
      if (project.storyboard?.scenes && Array.isArray(project.storyboard.scenes)) {
        const updatedStoryboardScenes = project.storyboard.scenes.map((s) => {
          if (
            (scene.sceneNumber !== undefined &&
              Number(s.sceneNumber) === Number(scene.sceneNumber)) ||
            s.id === scene.id
          ) {
            return {
              ...s,
              referenceImageUrl: assetUrl,
              imageUrl: assetUrl,
              imageStatus: "READY",
              status: "READY",
            };
          }
          return s;
        });

        try {
          await this.videoProjectRepository.update(project.id, {
            storyboard: {
              ...project.storyboard,
              scenes: updatedStoryboardScenes,
            },
          });
        } catch (projUpdateErr) {
          console.error("[STORYBOARD_SYNC_ERROR]", projUpdateErr);
        }
      }

      // Recalculate progress if use case exists
      if (this.calculateVideoProjectProgressUseCase) {
        try {
          await this.calculateVideoProjectProgressUseCase.execute({
            organizationId,
            projectId,
          });
        } catch (_) {}
      }

      return {
        success: true,
        scene: updatedScene,
        imageUrl: assetUrl,
        imageStatus: "READY",
        reused: false,
      };
    } catch (err) {
      // 12. On failure: Update scene status to FAILED, preserve previous image URL
      const sanitizedErr = this.sanitizeErrorMessage(err.message);
      const updateData = {
        errorMessage: sanitizedErr,
      };
      if (previousReferenceImageUrl) {
        updateData.referenceImageUrl = previousReferenceImageUrl;
      }

      await this.videoSceneRepository.updateStatus(
        scene.id,
        AI_VIDEO_SCENE_STATUS.FAILED,
        updateData,
      );

      // Normalize error code
      let errorCode = err.errorCode || err.code || "AI_IMAGE_GENERATION_FAILED";
      const errMsgLower = (err.message || "").toLowerCase();

      if (
        errorCode === "IMAGE_PROVIDER_UNAVAILABLE" ||
        errorCode === "AI_IMAGE_PROVIDER_NOT_CONFIGURED" ||
        errMsgLower.includes("not configured") ||
        errMsgLower.includes("api key is missing") ||
        errMsgLower.includes("unconfigured")
      ) {
        errorCode = "AI_IMAGE_PROVIDER_NOT_CONFIGURED";
      } else if (
        errorCode === "IMAGE_GENERATION_TIMEOUT" ||
        errorCode === "AI_IMAGE_TIMEOUT" ||
        errMsgLower.includes("timeout") ||
        errMsgLower.includes("timed out")
      ) {
        errorCode = "AI_IMAGE_TIMEOUT";
      } else if (errorCode === "AI_IMAGE_INVALID_RESPONSE") {
        errorCode = "AI_IMAGE_INVALID_RESPONSE";
      } else if (
        errorCode !== "AI_IMAGE_GENERATION_FAILED" &&
        !errorCode.startsWith("AI_")
      ) {
        errorCode = "AI_IMAGE_GENERATION_FAILED";
      }

      const statusCode =
        err.statusCode ||
        (errorCode === "AI_IMAGE_PROVIDER_NOT_CONFIGURED" ? 400 : 500);

      console.error("[AI VIDEO][SCENE IMAGE][FAILED]", {
        projectId: project?.id || projectId,
        sceneId: scene?.id || sceneId,
        provider: provider?.name || options?.providerName || "unknown",
        model: options?.model || provider?.defaultModel || "unknown",
        errorCode,
        statusCode,
        message: sanitizedErr,
      });

      throw new AppError(sanitizedErr, statusCode, errorCode);
    }
  }

  /**
   * Generates images for all scenes in a video project with controlled concurrency.
   */
  async executeBatch({
    organizationId,
    projectId,
    forceRegenerate = false,
    concurrency = 2,
    options = {},
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(
      projectId,
      organizationId,
    );
    if (!project) {
      throw new AppError(
        "Video project not found or unauthorized",
        404,
        "AI_VIDEO_PROJECT_NOT_FOUND",
      );
    }

    let scenes = [];
    if (this.videoSceneRepository) {
      scenes = await this.videoSceneRepository.findByProjectId(projectId);
    }

    if ((!scenes || scenes.length === 0) && project.storyboard?.scenes?.length > 0) {
      for (const sbScene of project.storyboard.scenes) {
        const created = await this.videoSceneRepository.create({
          videoProjectId: projectId,
          sceneNumber: sbScene.sceneNumber,
          duration: sbScene.duration || 5,
          visualPrompt: sbScene.visualPrompt || "",
          motionPrompt: sbScene.motionPrompt || "",
          dialogue: sbScene.dialogue || "",
          speaker: sbScene.speaker || "Narrator",
          characterIds: [],
          status: AI_VIDEO_SCENE_STATUS.PENDING,
        });
        scenes.push(created);
      }
    }

    if (!scenes || scenes.length === 0) {
      throw new AppError(
        "Storyboard is required before generating images",
        400,
        "AI_DIRECTOR_STORYBOARD_REQUIRED",
      );
    }

    scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);

    const results = [];
    let generatedCount = 0;
    let skippedCount = 0;

    const limit = Math.max(1, concurrency || 2);
    const queue = [...scenes];

    const worker = async () => {
      while (queue.length > 0) {
        const targetScene = queue.shift();
        if (!targetScene) break;

        // Skip if already generated and forceRegenerate is false
        if (
          !forceRegenerate &&
          targetScene.referenceImageUrl &&
          targetScene.status !== AI_VIDEO_SCENE_STATUS.FAILED
        ) {
          skippedCount++;
          results.push({
            sceneNumber: targetScene.sceneNumber,
            sceneId: targetScene.id,
            imageUrl: targetScene.referenceImageUrl,
            status: "READY",
            skipped: true,
          });
          continue;
        }

        try {
          const res = await this.execute({
            organizationId,
            projectId,
            sceneId: targetScene.id,
            sceneNumber: targetScene.sceneNumber,
            forceRegenerate,
            options,
          });
          generatedCount++;
          results.push({
            sceneNumber: targetScene.sceneNumber,
            sceneId: targetScene.id,
            imageUrl: res.imageUrl,
            status: "READY",
            skipped: false,
          });
        } catch (err) {
          results.push({
            sceneNumber: targetScene.sceneNumber,
            sceneId: targetScene.id,
            error: err.message,
            errorCode: err.errorCode,
            status: "FAILED",
            skipped: false,
          });
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(limit, scenes.length) },
      () => worker(),
    );
    await Promise.all(workers);

    results.sort((a, b) => a.sceneNumber - b.sceneNumber);

    return {
      success: true,
      total: scenes.length,
      generated: generatedCount,
      skipped: skippedCount,
      results,
    };
  }
}
