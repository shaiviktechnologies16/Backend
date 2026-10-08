import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_SCENE_STATUS, AI_VIDEO_PROJECT_STATUS } from "../../domain/constants/ai-video.constants.js";

/**
 * Generation Orchestrator for managing stage-level scene execution, retries, idempotency, and asset persistence.
 */
export class VideoGenerationOrchestrator {
  constructor({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    videoAssetRepository,
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
   * Executes a specific stage for a scene with stage-level recovery, idempotency, and failure isolation.
   */
  async executeStage({
    organizationId,
    projectId,
    sceneId,
    stage,
    forceRegenerate = false,
    language = null,
    options = {},
  }) {
    if (!organizationId || !projectId || !sceneId || !stage) {
      throw new AppError("Organization ID, Project ID, Scene ID, and Stage are required", 400, "MISSING_ORCHESTRATION_PARAMS");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(projectId, organizationId);
    if (!project) {
      throw new AppError("Video project not found or unauthorized", 404, "PROJECT_NOT_FOUND");
    }

    const scene = await this.videoSceneRepository.findById(sceneId);
    if (!scene || scene.videoProjectId !== projectId) {
      throw new AppError("Video scene not found or unauthorized", 404, "SCENE_NOT_FOUND");
    }

    const targetLanguage = language || project.language || "en";
    const stageUpper = stage.toUpperCase();

    // Idempotency check: reuse asset if already completed and not force regenerating
    if (!forceRegenerate) {
      const existingAsset = this.checkExistingAsset(scene, stageUpper, targetLanguage);
      if (existingAsset.isComplete) {
        return {
          scene,
          stage: stageUpper,
          status: "REUSED",
          assetUrl: existingAsset.url,
          reused: true,
        };
      }
    }

    // Set project status to GENERATING if currently DRAFT
    if (project.status === AI_VIDEO_PROJECT_STATUS.DRAFT || project.status === AI_VIDEO_PROJECT_STATUS.STORYBOARDING) {
      await this.videoProjectRepository.updateStatus(projectId, AI_VIDEO_PROJECT_STATUS.GENERATING);
    }

    let result;
    switch (stageUpper) {
      case "IMAGE":
        result = await this.executeImageStage(project, scene, forceRegenerate, options);
        break;
      case "VIDEO":
        result = await this.executeVideoStage(project, scene, forceRegenerate, options);
        break;
      case "AUDIO":
      case "TTS":
        result = await this.executeAudioStage(project, scene, targetLanguage, forceRegenerate, options);
        break;
      case "LIP_SYNC":
      case "LIPSYNC":
        result = await this.executeLipSyncStage(project, scene, targetLanguage, forceRegenerate, options);
        break;
      case "SUBTITLE":
      case "SUBTITLES":
        result = await this.executeSubtitleStage(project, scene, targetLanguage, forceRegenerate, options);
        break;
      default:
        throw new AppError(`Unsupported generation stage: ${stage}`, 400, "INVALID_GENERATION_STAGE");
    }

    // Recalculate progress after stage execution
    if (this.calculateVideoProjectProgressUseCase) {
      await this.calculateVideoProjectProgressUseCase.execute({ organizationId, projectId });
    }

    return result;
  }

  checkExistingAsset(scene, stage, language) {
    switch (stage) {
      case "IMAGE":
        return { isComplete: !!scene.referenceImageUrl && scene.status !== AI_VIDEO_SCENE_STATUS.FAILED, url: scene.referenceImageUrl };
      case "VIDEO":
        return { isComplete: !!scene.videoUrl && scene.status === AI_VIDEO_SCENE_STATUS.VIDEO_READY, url: scene.videoUrl };
      case "AUDIO":
      case "TTS":
        return { isComplete: !!scene.audioUrl && scene.status === AI_VIDEO_SCENE_STATUS.TTS_READY, url: scene.audioUrl };
      case "LIP_SYNC":
      case "LIPSYNC":
        return { isComplete: !!scene.videoUrl && scene.status === AI_VIDEO_SCENE_STATUS.COMPLETED, url: scene.videoUrl };
      case "SUBTITLE":
      case "SUBTITLES":
        return { isComplete: !!scene.metadata?.subtitleUrl, url: scene.metadata?.subtitleUrl };
      default:
        return { isComplete: false, url: null };
    }
  }

  async executeImageStage(project, scene, forceRegenerate, options) {
    const previousReferenceImageUrl = scene.referenceImageUrl;

    await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.IMAGE_GENERATING);

    try {
      const provider = this.videoProviderFactory.getImageProvider(options.providerName);
      const promptText = scene.visualPrompt || project.prompt || project.name;

      const characters = [];
      let referenceImageUrl = scene.referenceImageUrl;

      if (scene.characterIds?.length > 0 && this.videoCharacterRepository) {
        for (const charId of scene.characterIds) {
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
            if (!referenceImageUrl && char.referenceImageUrl) {
              referenceImageUrl = char.referenceImageUrl;
            }
          }
        }
      }

      const res = await provider.generateImage({
        prompt: promptText,
        referenceImageUrl,
        aspectRatio: project.aspectRatio,
        style: project.style,
        characters,
        organizationId: project.organizationId,
        projectId: project.id,
        options,
      });

      if (res.status === "FAILED" || !res.assetUrl) {
        throw new AppError(
          res.error || "Image generation returned empty asset URL",
          500,
          "IMAGE_GENERATION_FAILED",
        );
      }

      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.IMAGE_READY, {
        referenceImageUrl: res.assetUrl,
        metadata: { ...(scene.metadata || {}), imageProviderRes: res },
      });

      if (this.videoAssetRepository) {
        await this.videoAssetRepository.create({
          organizationId: project.organizationId,
          videoProjectId: project.id,
          sceneId: scene.id,
          type: "IMAGE",
          provider: res.provider,
          url: res.assetUrl,
          metadata: res.metadata,
        });
      }

      return { scene: updatedScene, stage: "IMAGE", status: "COMPLETED", assetUrl: res.assetUrl };
    } catch (err) {
      const updateData = {
        errorMessage: `Image Stage Failed: ${err.message}`,
      };
      if (previousReferenceImageUrl) {
        updateData.referenceImageUrl = previousReferenceImageUrl;
      }
      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.FAILED, updateData);
      
      const errorCode = err.errorCode || err.code || "IMAGE_GENERATION_FAILED";
      const statusCode = err.statusCode || 500;
      throw new AppError(err.message, statusCode, errorCode);
    }
  }

  async executeVideoStage(project, scene, forceRegenerate, options) {
    await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.VIDEO_GENERATING);

    try {
      const provider = this.videoProviderFactory.getVideoProvider(options.providerName);
      const imageUrl = scene.referenceImageUrl;
      const promptText = scene.motionPrompt || scene.visualPrompt || project.prompt;

      let res;
      try {
        res = await provider.generateVideo({
          prompt: promptText,
          imageUrl,
          duration: scene.duration || 5,
          aspectRatio: project.aspectRatio,
          style: project.style,
          options,
        });
      } catch (providerErr) {
        const isUnavailable =
          providerErr.code === "ECONNREFUSED" ||
          providerErr.errorCode === "AI_VIDEO_PROVIDER_UNAVAILABLE" ||
          providerErr.message?.includes("unreachable");

        if (isUnavailable && options.providerName !== "local") {
          try {
            const fallback = this.videoProviderFactory.getVideoProvider("placeholder");
            if (fallback && fallback !== provider) {
              res = await fallback.generateVideo({
                prompt: promptText,
                imageUrl,
                duration: scene.duration || 5,
                aspectRatio: project.aspectRatio,
                style: project.style,
                options,
              });
            }
          } catch (_) {}
        }
        if (!res) throw providerErr;
      }

      if (res.status === "FAILED" || !res.assetUrl) {
        throw new Error(res.error || "Video generation returned empty asset URL");
      }

      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.VIDEO_READY, {
        videoUrl: res.assetUrl,
        metadata: { ...(scene.metadata || {}), videoProviderRes: res },
      });

      if (this.videoAssetRepository) {
        await this.videoAssetRepository.create({
          organizationId: project.organizationId,
          videoProjectId: project.id,
          sceneId: scene.id,
          type: "VIDEO",
          provider: res.provider,
          url: res.assetUrl,
          metadata: res.metadata,
        });
      }

      return { scene: updatedScene, stage: "VIDEO", status: "COMPLETED", assetUrl: res.assetUrl };
    } catch (err) {
      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.FAILED, {
        errorMessage: `Video Stage Failed: ${err.message}`,
      });
      return { scene: updatedScene, stage: "VIDEO", status: "FAILED", error: err.message };
    }
  }

  async executeAudioStage(project, scene, language, forceRegenerate, options) {
    await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.TTS_GENERATING);

    try {
      const provider = this.videoProviderFactory.getTTSProvider(options.providerName);
      const dialogueText = scene.dialogue || scene.visualPrompt || "Background narration";

      const res = await provider.generateSpeech({
        text: dialogueText,
        language,
        voice: options.voice || "default",
        characterId: scene.characterIds?.[0] || null,
        options,
      });

      if (res.status === "FAILED" || !res.assetUrl) {
        throw new Error(res.error || "TTS generation returned empty audio URL");
      }

      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.TTS_READY, {
        audioUrl: res.assetUrl,
        metadata: { ...(scene.metadata || {}), ttsProviderRes: res, language },
      });

      if (this.videoAssetRepository) {
        await this.videoAssetRepository.create({
          organizationId: project.organizationId,
          videoProjectId: project.id,
          sceneId: scene.id,
          type: "VOICE",
          provider: res.provider,
          url: res.assetUrl,
          metadata: { ...res.metadata, language },
        });
      }

      return { scene: updatedScene, stage: "AUDIO", status: "COMPLETED", assetUrl: res.assetUrl };
    } catch (err) {
      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.FAILED, {
        errorMessage: `Audio TTS Stage Failed: ${err.message}`,
      });
      return { scene: updatedScene, stage: "AUDIO", status: "FAILED", error: err.message };
    }
  }

  async executeLipSyncStage(project, scene, language, forceRegenerate, options) {
    await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.LIP_SYNC_GENERATING);

    try {
      const provider = this.videoProviderFactory.getLipSyncProvider(options.providerName);

      if (!scene.videoUrl) {
        throw new Error("Video asset is required before running LipSync stage");
      }
      if (!scene.audioUrl) {
        throw new Error("Audio asset is required before running LipSync stage");
      }

      const res = await provider.generateLipSync({
        videoUrl: scene.videoUrl,
        audioUrl: scene.audioUrl,
        characterId: scene.characterIds?.[0] || null,
        options,
      });

      if (res.status === "FAILED" || !res.assetUrl) {
        throw new Error(res.error || "LipSync generation returned empty video URL");
      }

      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.COMPLETED, {
        videoUrl: res.assetUrl,
        metadata: { ...(scene.metadata || {}), lipSyncProviderRes: res, language },
      });

      if (this.videoAssetRepository) {
        await this.videoAssetRepository.create({
          organizationId: project.organizationId,
          videoProjectId: project.id,
          sceneId: scene.id,
          type: "VIDEO",
          provider: res.provider,
          url: res.assetUrl,
          metadata: { ...res.metadata, stage: "LIP_SYNC", language },
        });
      }

      return { scene: updatedScene, stage: "LIP_SYNC", status: "COMPLETED", assetUrl: res.assetUrl };
    } catch (err) {
      const updatedScene = await this.videoSceneRepository.updateStatus(scene.id, AI_VIDEO_SCENE_STATUS.FAILED, {
        errorMessage: `LipSync Stage Failed: ${err.message}`,
      });
      return { scene: updatedScene, stage: "LIP_SYNC", status: "FAILED", error: err.message };
    }
  }

  async executeSubtitleStage(project, scene, language, forceRegenerate, options) {
    try {
      const provider = this.videoProviderFactory.getSubtitleProvider(options.providerName);

      const res = await provider.generateSubtitles({
        audioUrl: scene.audioUrl,
        dialogue: scene.dialogue,
        language,
        options,
      });

      const updatedMetadata = {
        ...(scene.metadata || {}),
        subtitleUrl: res.assetUrl,
        subtitleSrt: res.srtContent,
        subtitleLanguage: language,
      };

      const updatedScene = await this.videoSceneRepository.update(scene.id, {
        metadata: updatedMetadata,
      });

      if (this.videoAssetRepository && res.assetUrl) {
        await this.videoAssetRepository.create({
          organizationId: project.organizationId,
          videoProjectId: project.id,
          sceneId: scene.id,
          type: "SUBTITLE",
          provider: res.provider,
          url: res.assetUrl,
          metadata: { ...res.metadata, language },
        });
      }

      return { scene: updatedScene, stage: "SUBTITLE", status: "COMPLETED", assetUrl: res.assetUrl };
    } catch (err) {
      return { scene, stage: "SUBTITLE", status: "FAILED", error: err.message };
    }
  }
}
