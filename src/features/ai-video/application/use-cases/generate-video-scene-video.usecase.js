import { AppError } from "../../../../common/errors/AppError.js";
import {
  AI_VIDEO_SCENE_STATUS,
  AI_VIDEO_PROJECT_STATUS,
} from "../../domain/constants/ai-video.constants.js";

/**
 * Use case for generating an animated video scene for a video project
 * using our local/self-hosted video generation model.
 */
export class GenerateVideoSceneVideoUseCase {
  constructor({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository = null,
    videoAssetRepository = null,
    videoProviderFactory,
    storageProvider = null,
    uploadFileUseCase = null,
    calculateVideoProjectProgressUseCase = null,
  }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
    this.videoCharacterRepository = videoCharacterRepository;
    this.videoAssetRepository = videoAssetRepository;
    this.videoProviderFactory = videoProviderFactory;
    this.storageProvider = storageProvider;
    this.uploadFileUseCase = uploadFileUseCase;
    this.calculateVideoProjectProgressUseCase = calculateVideoProjectProgressUseCase;
  }

  /**
   * Sanitizes error message to strip sensitive credentials or tokens.
   */
  sanitizeErrorMessage(message) {
    if (!message || typeof message !== "string") {
      return "Video scene generation failed";
    }
    return message
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
      .replace(/sk-[A-Za-z0-9_-]{10,}/gi, "sk-[REDACTED]")
      .replace(/key=[A-Za-z0-9._-]+/gi, "key=[REDACTED]");
  }

  /**
   * Builds an expansive, production-ready video animation prompt
   * synthesizing character appearance, motion, camera, dialogue, and style.
   */
  buildVideoPrompt({ scene, project, characters = [] }) {
    const parts = [];

    // 1. Visual description / Scene setting
    const visual = (scene.visualPrompt || "").trim();
    if (visual) {
      parts.push(visual);
    } else if (project.prompt) {
      parts.push(project.prompt);
    }

    // 2. Character presence and descriptions
    if (characters.length > 0) {
      const charDescriptions = characters.map((c) => {
        let desc = c.name;
        if (c.description) desc += ` (${c.description})`;
        if (c.style) desc += ` styled in ${c.style}`;
        return desc;
      });
      parts.push(`Featuring: ${charDescriptions.join("; ")}.`);
    }

    // 3. Motion, Action, & Camera Direction
    const motion = (scene.motionPrompt || "").trim();
    if (motion) {
      parts.push(`Camera & Motion: ${motion}`);
    } else {
      parts.push("Camera & Motion: smooth cinematic shot with dynamic camera movement and natural character animation.");
    }

    // 4. Dialogue / Expression Context
    if (scene.dialogue) {
      const speaker = scene.speaker || "Character";
      parts.push(`Contextual speech & expression: ${speaker} expressing "${scene.dialogue}".`);
    }

    // 5. Aesthetic style, aspect ratio, duration
    const style = project.style || scene.metadata?.style || "3d-cartoon";
    const aspectRatio = project.aspectRatio || "9:16";
    const duration = scene.duration || 5;

    parts.push(`Visual Style: ${style}. Composition: ${aspectRatio}. Scene Duration: ${duration} seconds.`);

    return parts.join(" ");
  }

  /**
   * Executes video scene generation.
   */
  async execute({
    organizationId,
    projectId,
    sceneNumber = null,
    sceneId = null,
    forceRegenerate = false,
    isSync = false,
    sync = false,
    options = {},
  }) {
    const runSync = Boolean(isSync || sync || options.sync || options.isSync);
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
      throw new AppError("Scene number or scene ID is required", 400, "MISSING_SCENE_IDENTIFIER");
    }

    // 2. Retrieve project
    const project = await this.videoProjectRepository.findByIdForOrganization(
      projectId,
      organizationId,
    );
    if (!project) {
      throw new AppError("Video project not found or unauthorized", 404, "AI_VIDEO_PROJECT_NOT_FOUND");
    }

    // 3. Retrieve scenes
    let existingScenes = [];
    if (this.videoSceneRepository) {
      existingScenes = await this.videoSceneRepository.findByProjectId(projectId);
    }

    // 4. Resolve target scene
    let scene = null;
    if (sceneId) {
      scene = existingScenes.find((s) => s.id === sceneId) || (await this.videoSceneRepository?.findById(sceneId));
      if (scene && scene.videoProjectId !== projectId) {
        scene = null;
      }
    } else if (sceneNumber !== null && sceneNumber !== undefined) {
      scene = existingScenes.find((s) => Number(s.sceneNumber) === Number(sceneNumber));
    }

    // Fallback: If scene not yet created in repository but exists in project.storyboard
    if (!scene && project.storyboard?.scenes && Array.isArray(project.storyboard.scenes)) {
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
      throw new AppError(`Scene ${sceneNumber ?? sceneId} not found`, 404, "AI_VIDEO_SCENE_NOT_FOUND");
    }

    // 5. Idempotency Check: Reuse existing video if already ready and not force regenerating
    if (
      !forceRegenerate &&
      scene.videoUrl &&
      (scene.status === "READY" || scene.status === AI_VIDEO_SCENE_STATUS.VIDEO_READY || scene.status === "COMPLETED")
    ) {
      return {
        success: true,
        scene,
        videoUrl: scene.videoUrl,
        status: "READY",
        reused: true,
      };
    }

    // 6. Resolve Characters and Stored Reference Images
    const characters = [];
    let allOrgCharacters = [];

    if (this.videoCharacterRepository) {
      try {
        const charRes = await this.videoCharacterRepository.findAllByOrganization(organizationId);
        allOrgCharacters = charRes?.characters || [];
      } catch (_) {}
    }

    // Match characters by characterIds or speaker/name
    if (Array.isArray(scene.characterIds) && scene.characterIds.length > 0) {
      for (const charId of scene.characterIds) {
        const match = allOrgCharacters.find((c) => c.id === charId);
        if (match && !characters.some((c) => c.id === match.id)) {
          characters.push(match);
        }
      }
    }

    if (scene.speaker) {
      const speakerLower = scene.speaker.toLowerCase().trim();
      const match = allOrgCharacters.find((c) => (c.name || "").toLowerCase().trim() === speakerLower);
      if (match && !characters.some((c) => c.id === match.id)) {
        characters.push(match);
      }
    }

    // Primary character reference image
    const charWithRef = characters.find((c) => Boolean(c.referenceImageUrl));
    const primaryReferenceImageUrl = charWithRef?.referenceImageUrl || scene.referenceImageUrl || null;

    // 7. Resolve Video Provider
    let provider = null;
    try {
      provider = this.videoProviderFactory.getVideoProvider(options.providerName || "default");
    } catch (_) {
      throw new AppError("Video generation provider is not configured", 503, "AI_VIDEO_PROVIDER_UNAVAILABLE");
    }

    if (!provider) {
      throw new AppError("Video generation provider is not configured", 503, "AI_VIDEO_PROVIDER_UNAVAILABLE");
    }

    // 8. Construct production video prompt
    const constructedPrompt = this.buildVideoPrompt({ scene, project, characters });

    // Non-sensitive diagnostic log
    console.log("[AI VIDEO][SCENE VIDEO][START]", {
      projectId: project.id,
      sceneId: scene.id,
      provider: provider.name,
      model: provider.model,
      characterCount: characters.length,
      hasReferenceImage: Boolean(primaryReferenceImageUrl),
    });

    const previousVideoUrl = scene.videoUrl;
    const jobId = `vidjob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 9. Update Scene Status to VIDEO_GENERATING
    const updatedScene = await this.videoSceneRepository.updateStatus(
      scene.id,
      AI_VIDEO_SCENE_STATUS.VIDEO_GENERATING,
      {
        errorMessage: null,
        metadata: {
          ...(scene.metadata || {}),
          videoProvider: provider.name,
          videoModel: provider.model,
          videoGenerationJobId: jobId,
        },
      },
    );

    // 10. Generation Processor (synchronous or background)
    const processGeneration = async () => {
      try {
        const genResult = await provider.generateVideo({
          prompt: constructedPrompt,
          motionPrompt: scene.motionPrompt || "",
          duration: scene.duration || 5,
          aspectRatio: project.aspectRatio || "9:16",
          style: project.style || "3d-cartoon",
          characters: characters.map((c) => ({
            name: c.name,
            referenceImageUrl: c.referenceImageUrl || null,
          })),
          referenceImageUrl: primaryReferenceImageUrl,
          options,
        });

        let finalVideoUrl = genResult.videoUrl || genResult.assetUrl;
        const activeJobId = genResult.jobId || jobId;

        // If provider returned an asynchronous job, poll status until ready
        if (!finalVideoUrl && genResult.status === "GENERATING" && !options.skipPolling) {
          const maxWaitMs = Math.min(Number(process.env.VIDEO_GENERATION_TIMEOUT_MS) || 600000, 600000);
          const startTime = Date.now();
          const pollIntervalMs = Number(options.pollIntervalMs) || 3000;

          while (Date.now() - startTime < maxWaitMs) {
            await new Promise((r) => {
              const timer = setTimeout(r, pollIntervalMs);
              if (timer && typeof timer.unref === "function") {
                timer.unref();
              }
            });
            const statusRes = await provider.getGenerationStatus(activeJobId);

            if (statusRes.status === "READY") {
              finalVideoUrl = statusRes.videoUrl || statusRes.assetUrl;
              break;
            }

            if (statusRes.status === "FAILED") {
              throw new AppError(statusRes.error || "Video generation failed on local provider", 500, "AI_VIDEO_GENERATION_FAILED");
            }
          }

          if (!finalVideoUrl) {
            throw new AppError("Video generation timed out waiting for local provider", 408, "AI_VIDEO_GENERATION_TIMEOUT");
          }
        }

        if (!finalVideoUrl && !options.skipPolling) {
          throw new AppError("Video provider returned empty video URL", 502, "AI_VIDEO_GENERATION_INVALID_RESPONSE");
        }

        if (!finalVideoUrl && options.skipPolling) {
          return {
            success: true,
            status: "GENERATING",
            jobId: activeJobId,
            scene,
          };
        }

        // Store video in Shaivik permanent storage if provider provides download or storage
        if (provider.storeVideoPermanently) {
          try {
            finalVideoUrl = await provider.storeVideoPermanently({
              rawUrl: finalVideoUrl,
              jobId: activeJobId,
              organizationId: project.organizationId,
              projectId: project.id,
              options,
            });
          } catch (_) {}
        }

        // Persist video asset record
        if (this.videoAssetRepository) {
          try {
            await this.videoAssetRepository.create({
              organizationId: project.organizationId,
              videoProjectId: project.id,
              sceneId: scene.id,
              type: "VIDEO",
              provider: provider.name,
              url: finalVideoUrl,
              metadata: { model: provider.model, duration: scene.duration },
            });
          } catch (_) {}
        }

        // Update scene to VIDEO_READY
        const readyScene = await this.videoSceneRepository.updateStatus(
          scene.id,
          AI_VIDEO_SCENE_STATUS.VIDEO_READY,
          {
            videoUrl: finalVideoUrl,
            errorMessage: null,
            metadata: {
              ...(scene.metadata || {}),
              videoProvider: provider.name,
              videoModel: provider.model,
              videoDuration: scene.duration || 5,
              videoGenerationJobId: activeJobId,
            },
          },
        );

        // Update project storyboard scene
        if (project.storyboard?.scenes && Array.isArray(project.storyboard.scenes)) {
          const updatedSbScenes = project.storyboard.scenes.map((s) => {
            if (
              (scene.sceneNumber !== undefined && Number(s.sceneNumber) === Number(scene.sceneNumber)) ||
              s.id === scene.id
            ) {
              return {
                ...s,
                videoUrl: finalVideoUrl,
                status: "READY",
              };
            }
            return s;
          });

          await this.videoProjectRepository.update(project.id, {
            storyboard: { ...project.storyboard, scenes: updatedSbScenes },
          });
        }

        // Recalculate project progress
        if (this.calculateVideoProjectProgressUseCase) {
          try {
            await this.calculateVideoProjectProgressUseCase.execute({ organizationId, projectId });
          } catch (_) {}
        }

        return {
          success: true,
          status: "READY",
          videoUrl: finalVideoUrl,
          scene: readyScene,
        };
      } catch (err) {
        const sanitizedErr = this.sanitizeErrorMessage(err.message);
        const errorCode = err.errorCode || err.code || "AI_VIDEO_GENERATION_FAILED";

        console.error("[AI VIDEO][SCENE VIDEO][FAILED]", {
          projectId: project.id,
          sceneId: scene.id,
          provider: provider.name,
          model: provider.model,
          errorCode,
          message: sanitizedErr,
        });

        const updateData = {
          errorMessage: sanitizedErr,
          metadata: {
            ...(scene.metadata || {}),
            videoError: sanitizedErr,
          },
        };
        if (previousVideoUrl) {
          updateData.videoUrl = previousVideoUrl; // Preserve existing video on failed regeneration
        }

        await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.FAILED, updateData);
        throw err;
      }
    };

    if (runSync) {
      return await processGeneration();
    }

    // Default asynchronous handling: kick off background execution and return immediately
    const bgPromise = processGeneration();
    bgPromise.catch((err) => {
      console.error("[AI VIDEO][SCENE VIDEO][BG_ERROR]", {
        projectId,
        sceneId: scene.id,
        error: err.message,
      });
    });

    return {
      success: true,
      status: "GENERATING",
      jobId,
      scene: {
        id: updatedScene.id,
        sceneNumber: updatedScene.sceneNumber,
        status: "GENERATING",
        videoUrl: previousVideoUrl || null,
      },
    };
  }

  /**
   * Generates video clips for all scenes in a video project.
   */
  async executeBatch({
    organizationId,
    projectId,
    forceRegenerate = false,
    options = {},
  }) {
    const project = await this.videoProjectRepository.findByIdForOrganization(projectId, organizationId);
    if (!project) {
      throw new AppError("Video project not found or unauthorized", 404, "AI_VIDEO_PROJECT_NOT_FOUND");
    }

    const scenes = await this.videoSceneRepository.findByProjectId(projectId);
    if (!scenes || scenes.length === 0) {
      throw new AppError("No scenes found in project", 404, "AI_VIDEO_SCENE_NOT_FOUND");
    }

    const results = [];
    for (const scene of scenes) {
      const res = await this.execute({
        organizationId,
        projectId,
        sceneId: scene.id,
        forceRegenerate,
        isSync: false,
        options,
      });
      results.push(res);
    }

    return {
      success: true,
      totalScenes: scenes.length,
      started: results.length,
      status: "GENERATING",
    };
  }
}
