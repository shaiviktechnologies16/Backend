import { AppError } from "../../../../common/errors/AppError.js";
import {
  AI_VIDEO_PROJECT_STATUS,
  AI_VIDEO_SCENE_STATUS,
  AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
} from "../../domain/constants/ai-video.constants.js";
import { StoryboardValidator } from "../validators/storyboard.validator.js";
import { extractChatContent } from "../utils/extract-chat-content.js";
import {
  getLanguageInstruction,
  validateSpokenLanguage,
} from "../utils/language-prompt.helper.js";

function isCapacityOrAvailabilityError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = String(error.code || error.statusCode || error.status || "");
  const status = String(error.status || "");

  if (code === "503" || status === "503" || code === "UNAVAILABLE" || code === "RESOURCE_EXHAUSTED") {
    return true;
  }

  if (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("no capacity available") ||
    msg.includes("capacity") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("service unavailable")
  ) {
    return true;
  }

  return false;
}

export class GenerateVideoStoryboardUseCase {
  constructor({
    videoProjectRepository,
    videoSceneRepository,
    videoCharacterRepository,
    aiProviderFactory,
    fallbackProviderFactory = null,
  }) {
    this.videoProjectRepository = videoProjectRepository;
    this.videoSceneRepository = videoSceneRepository;
    this.videoCharacterRepository = videoCharacterRepository;
    this.aiProviderFactory = aiProviderFactory;
    this.fallbackProviderFactory = fallbackProviderFactory;
  }

  async execute({
    organizationId,
    createdById,
    projectId,
    scriptText = null,
    topicPrompt = null,
    targetDuration = 30,
    aspectRatio = "9:16",
    language = "en",
    style = "cartoon",
    forceRegenerate = false,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!projectId) {
      throw new AppError("Project ID is required", 400, "MISSING_PROJECT_ID");
    }

    const project = await this.videoProjectRepository.findByIdForOrganization(
      projectId,
      organizationId
    );

    if (!project) {
      throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
    }

    // Idempotency: Return existing valid storyboard if forceRegenerate is false
    if (!forceRegenerate && project.storyboard && project.status === AI_VIDEO_PROJECT_STATUS.READY) {
      let existingScenes = [];
      if (this.videoSceneRepository) {
        existingScenes = await this.videoSceneRepository.findByProjectId(projectId);
      }
      return {
        project,
        storyboard: project.storyboard,
        scenes: existingScenes,
      };
    }

    await this.videoProjectRepository.updateStatus(
      projectId,
      AI_VIDEO_PROJECT_STATUS.GENERATING,
      { errorMessage: null }
    );

    const startTime = Date.now();
    const scriptToUse = extractChatContent(scriptText || project.script || topicPrompt || project.prompt);

    if (!scriptToUse || (typeof scriptToUse === "string" && !scriptToUse.trim())) {
      throw new AppError(
        "Cannot generate storyboard because the project script is empty.",
        400,
        "AI_DIRECTOR_SCRIPT_REQUIRED"
      );
    }

    const inputScript = scriptToUse;
    console.log("[AI VIDEO] Starting storyboard generation", { projectId, scriptLength: inputScript.length });

    const projectLanguage = language || project.language || "en";
    const projectStyle = style || project.style || "cartoon";
    const projectAspect = aspectRatio || project.aspectRatio || "9:16";
    const projectDuration = targetDuration || project.duration || 30;

    const langInstruction = getLanguageInstruction(projectLanguage);

    const systemPrompt = `You are a master AI Video Director. Your ONLY task is to analyze the provided video script and convert it into a structured JSON Storyboard.
CRITICAL INSTRUCTION: You MUST parse every scene beat and dialogue marker in the input script into a separate object inside the "scenes" array.
Return ONLY raw valid JSON with NO commentary or markdown formatting.

${langInstruction}

JSON Schema:
{
  "title": "string",
  "synopsis": "string",
  "language": "${projectLanguage}",
  "aspectRatio": "${projectAspect}",
  "style": "${projectStyle}",
  "duration": ${projectDuration},
  "characters": [
    {
      "name": "string",
      "gender": "male | female | unspecified",
      "prompt": "detailed visual appearance description",
      "voice": "string"
    }
  ],
  "scenes": [
    {
      "sceneNumber": number (1, 2, 3...),
      "startTime": number (start timestamp in seconds, e.g. 0),
      "endTime": number (end timestamp in seconds, e.g. 6),
      "duration": number (duration in seconds, e.g. 6),
      "visualPrompt": "detailed background/environment and visual setup description in English",
      "motionPrompt": "camera movement and character motion description in English",
      "dialogue": "exact spoken dialogue or voiceover text in ${projectLanguage}",
      "speaker": "character name or Narrator",
      "characterNames": ["character name"]
    }
  ]
}`;

    const userPrompt = `Input Script to convert into Storyboard:
"""
${inputScript}
"""

Target video duration: ${projectDuration} seconds.
Language: ${projectLanguage}.
Aspect Ratio: ${projectAspect}.
Style: ${projectStyle}.

Convert the above generated video script into a structured JSON Storyboard. Make sure the scenes array is NON-EMPTY, accurately reflects the script's dialogue and scenes, and has scene durations totaling approximately ${projectDuration} seconds. Return ONLY JSON.`;

    let primaryProvider;
    try {
      primaryProvider = typeof this.aiProviderFactory.getProvider === "function"
        ? await this.aiProviderFactory.getProvider()
        : this.aiProviderFactory;
    } catch (err) {
      const errCode = "AI_DIRECTOR_PROVIDER_UNAVAILABLE";
      await this.videoProjectRepository.updateStatus(projectId, AI_VIDEO_PROJECT_STATUS.FAILED, {
        errorMessage: `Failed to resolve AI Provider: ${err.message}`,
      });
      throw new AppError(`AI Provider error: ${err.message}`, 500, errCode);
    }

    let fallbackProvider = null;
    if (this.fallbackProviderFactory) {
      try {
        fallbackProvider = typeof this.fallbackProviderFactory.getProvider === "function"
          ? await this.fallbackProviderFactory.getProvider()
          : this.fallbackProviderFactory;
      } catch (fbErr) {
        console.warn("[AI VIDEO] Failed to resolve fallbackProviderFactory:", fbErr.message);
      }
    }
    if (!fallbackProvider && typeof this.aiProviderFactory.getProviderByName === "function") {
      const primaryName = (primaryProvider?.name || "").toLowerCase();
      fallbackProvider = primaryName === "ollama"
        ? this.aiProviderFactory.getProviderByName("openai")
        : this.aiProviderFactory.getProviderByName("ollama");
    } else if (!fallbackProvider && this.aiProviderFactory.fallbackProvider) {
      fallbackProvider = this.aiProviderFactory.fallbackProvider;
    }

    console.log(`[AI VIDEO][STORYBOARD]\nprojectId=${projectId}\nscriptLength=${inputScript.length}\nprovider=${primaryProvider?.name || "default"}`);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const executeProviderCall = async (targetProvider, attemptLabel = "1") => {
      let pName = "default";
      try {
        pName = targetProvider.name || "default";
      } catch {
        pName = "default";
      }
      let pModel = "default";
      try {
        pModel = targetProvider.model || "default";
      } catch {
        pModel = "default";
      }

      console.log(`[AI VIDEO][STORYBOARD PROVIDER]\nprojectId=${projectId}\nprovider=${pName}\nmodel=${pModel}\nattempt=${attemptLabel}`);

      const response = await targetProvider.chat(messages, {
        temperature: 0.3,
        maxTokens: 4096,
        timeout: AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
      });

      let extracted = extractChatContent(response);

      if (typeof extracted !== "string") {
        throw new AppError(
          "AI Director returned an invalid storyboard response.",
          502,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      if (!extracted.trim()) {
        throw new AppError(
          "AI provider returned empty storyboard response",
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      // Spoken Language Validation & Single Retry
      const isValidLang = validateSpokenLanguage(extracted, projectLanguage);
      if (!isValidLang) {
        console.warn("[AI_DIRECTOR_STORYBOARD_LANGUAGE_RETRY]", {
          projectId,
          language: projectLanguage,
        });

        const retryMessages = [
          ...messages,
          { role: "assistant", content: extracted },
          {
            role: "user",
            content: `CRITICAL CORRECTION: The previous storyboard generated dialogue in English. Every scene's "dialogue" field MUST be written in "${projectLanguage}" script. Visual prompts may remain in English. Regenerate the JSON storyboard now obeying this requirement.`,
          },
        ];

        const retryResponse = await targetProvider.chat(retryMessages, {
          temperature: 0.3,
          maxTokens: 4096,
          timeout: AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
        });

        const retryExtracted = extractChatContent(retryResponse);

        if (
          typeof retryExtracted === "string" &&
          retryExtracted.trim() &&
          validateSpokenLanguage(retryExtracted, projectLanguage)
        ) {
          extracted = retryExtracted;
        } else {
          throw new AppError(
            `Generated storyboard dialogue violated selected language (${projectLanguage}) requirements. Spoken dialogue must be in ${projectLanguage}.`,
            422,
            "AI_DIRECTOR_LANGUAGE_MISMATCH"
          );
        }
      }

      return extracted;
    };

    let rawResponse;
    let successfulProvider = primaryProvider;

    try {
      try {
        rawResponse = await executeProviderCall(primaryProvider, "1");
        successfulProvider = primaryProvider;
      } catch (primaryErr) {
        // If it's a timeout, do not retry / fall back (preserve timeout behavior)
        if (primaryErr.code === "AI_DIRECTOR_TIMEOUT" || primaryErr.message?.includes("timed out")) {
          throw primaryErr;
        }

        // If it's not a capacity / availability error, do not retry or fall back (fail fast on malformed response)
        if (!isCapacityOrAvailabilityError(primaryErr)) {
          throw primaryErr;
        }

        // Primary 503 / capacity failure: Try max 1 retry on primary
        let primaryRetrySucceeded = false;
        try {
          console.warn("[AI VIDEO][STORYBOARD PRIMARY RETRY]", {
            projectId,
            provider: primaryProvider?.name,
            reason: primaryErr.message,
          });
          rawResponse = await executeProviderCall(primaryProvider, "2");
          successfulProvider = primaryProvider;
          primaryRetrySucceeded = true;
        } catch (retryErr) {
          if (retryErr.code === "AI_DIRECTOR_TIMEOUT" || retryErr.message?.includes("timed out")) {
            throw retryErr;
          }
        }

        // If primary retry did not succeed, attempt fallback provider
        if (!primaryRetrySucceeded) {
          if (fallbackProvider && fallbackProvider !== primaryProvider) {
            let primaryName = "primary";
            try { primaryName = primaryProvider?.name || "primary"; } catch { primaryName = "primary"; }
            let primaryModel = "default";
            try { primaryModel = primaryProvider?.model || "default"; } catch { primaryModel = "default"; }
            let fallbackName = "fallback";
            try { fallbackName = fallbackProvider?.name || "fallback"; } catch { fallbackName = "fallback"; }
            let fallbackModel = "default";
            try { fallbackModel = fallbackProvider?.model || "default"; } catch { fallbackModel = "default"; }

            console.log(`[AI VIDEO][STORYBOARD PROVIDER FALLBACK]\nprojectId=${projectId}\nprimaryProvider=${primaryName}\nprimaryModel=${primaryModel}\nfallbackProvider=${fallbackName}\nfallbackModel=${fallbackModel}\nreason=${primaryErr.message}`);

            rawResponse = await executeProviderCall(fallbackProvider, "fallback-1");
            successfulProvider = fallbackProvider;
          } else {
            throw primaryErr;
          }
        }
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isTimeout = error.code === "AI_DIRECTOR_TIMEOUT" || error.message?.includes("timed out");
      const errorCode = isTimeout ? "AI_DIRECTOR_TIMEOUT" : (error.errorCode || error.code || "AI_DIRECTOR_GENERATION_FAILED");

      console.error("[AI_DIRECTOR_STORYBOARD_FAILED]", {
        provider: successfulProvider?.name || primaryProvider?.name || "unknown",
        projectId,
        organizationId,
        durationMs,
        errorCategory: errorCode,
        error: error.message,
      });

      await this.videoProjectRepository.updateStatus(projectId, AI_VIDEO_PROJECT_STATUS.FAILED, {
        errorMessage: error.message,
      });
      if (error instanceof AppError) throw error;
      throw new AppError(`Storyboard AI generation failed: ${error.message}`, 500, errorCode);
    }

    let storyboard;
    try {
      storyboard = StoryboardValidator.validate(rawResponse, projectDuration);
    } catch (valErr) {
      const durationMs = Date.now() - startTime;
      console.error("[AI_DIRECTOR_STORYBOARD_INVALID_JSON]", {
        provider: successfulProvider?.name || primaryProvider?.name || "unknown",
        projectId,
        organizationId,
        durationMs,
        errorCategory: "AI_DIRECTOR_INVALID_RESPONSE",
        error: valErr.message,
      });

      await this.videoProjectRepository.updateStatus(projectId, AI_VIDEO_PROJECT_STATUS.FAILED, {
        errorMessage: valErr.message,
      });
      throw new AppError(`Invalid storyboard response: ${valErr.message}`, 422, "AI_DIRECTOR_INVALID_RESPONSE");
    }

    // Process characters
    const characterMap = new Map();
    if (this.videoCharacterRepository && storyboard.characters.length > 0) {
      for (const charDef of storyboard.characters) {
        try {
          const existingList = await this.videoCharacterRepository.findAllByOrganization(organizationId, { limit: 100 });
          let charEntity = existingList.characters.find(c => c.name.toLowerCase() === charDef.name.toLowerCase());
          if (!charEntity && createdById) {
            charEntity = await this.videoCharacterRepository.create({
              organizationId,
              createdById,
              name: charDef.name,
              description: charDef.prompt,
              style: storyboard.style,
            });
          }
          if (charEntity) {
            characterMap.set(charDef.name.toLowerCase(), charEntity.id);
          }
        } catch (charErr) {
          console.error("[STORYBOARD_CHAR_CREATE_ERROR]", charErr);
        }
      }
    }

    // Clear old scenes for project AFTER successful AI generation and validation
    if (this.videoSceneRepository) {
      await this.videoSceneRepository.deleteByProjectId(projectId);
    }

    // Save new scenes
    const createdScenes = [];
    if (this.videoSceneRepository) {
      for (const sceneDef of storyboard.scenes) {
        const sceneCharIds = (sceneDef.characterNames || [])
          .map(name => characterMap.get(name.toLowerCase()))
          .filter(Boolean);

        const createdScene = await this.videoSceneRepository.create({
          videoProjectId: projectId,
          sceneNumber: sceneDef.sceneNumber,
          duration: sceneDef.duration,
          visualPrompt: sceneDef.visualPrompt,
          motionPrompt: sceneDef.motionPrompt,
          dialogue: sceneDef.dialogue,
          speaker: sceneDef.speaker,
          characterIds: sceneCharIds,
          status: AI_VIDEO_SCENE_STATUS.PENDING,
        });

        createdScenes.push(createdScene);
      }
    }

    const updatedProject = await this.videoProjectRepository.update(projectId, {
      storyboard,
      duration: storyboard.duration,
      status: AI_VIDEO_PROJECT_STATUS.READY,
      errorMessage: null,
    });

    const verifyProject = await this.videoProjectRepository.findByIdForOrganization(projectId, organizationId);
    if (!verifyProject?.storyboard?.scenes || !Array.isArray(verifyProject.storyboard.scenes) || verifyProject.storyboard.scenes.length === 0) {
      throw new AppError("Failed to persist storyboard scenes to database", 500, "STORYBOARD_PERSIST_FAILED");
    }

    let sName = "default";
    try { sName = successfulProvider?.name || "default"; } catch { sName = "default"; }
    let sModel = "default";
    try { sModel = successfulProvider?.model || "default"; } catch { sModel = "default"; }

    console.log(`[AI VIDEO][STORYBOARD RESULT]\nprojectId=${projectId}\nprovider=${sName}\nmodel=${sModel}\nsceneCount=${storyboard.scenes.length}\nduration=${storyboard.duration}\nstatus=${AI_VIDEO_PROJECT_STATUS.READY}`);
    console.log(`[AI VIDEO][STORYBOARD PERSISTED]\nprojectId=${projectId}\nsceneCount=${createdScenes.length || storyboard.scenes.length}`);

    console.log("[AI_DIRECTOR_STORYBOARD_SUCCESS]", {
      provider: sName,
      projectId,
      organizationId,
      sceneCount: createdScenes.length,
      durationMs: Date.now() - startTime,
    });

    return {
      project: updatedProject,
      storyboard,
      scenes: createdScenes,
    };
  }
}
