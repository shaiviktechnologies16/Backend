import { AppError } from "../../../../common/errors/AppError.js";
import {
  AI_VIDEO_PROJECT_STATUS,
  AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
} from "../../domain/constants/ai-video.constants.js";
import { normalizeScriptContent } from "../utils/extract-chat-content.js";
import {
  getLanguageInstruction,
  validateSpokenLanguage,
} from "../utils/language-prompt.helper.js";

export class GenerateVideoScriptUseCase {
  constructor({ videoProjectRepository, aiProviderFactory }) {
    this.videoProjectRepository = videoProjectRepository;
    this.aiProviderFactory = aiProviderFactory;
  }

  async execute({
    organizationId,
    projectId,
    topicPrompt = null,
    targetDuration = 30,
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

    // Idempotency: Return existing valid script if forceRegenerate is false
    if (!forceRegenerate && project.script && project.status === AI_VIDEO_PROJECT_STATUS.READY) {
      return {
        project,
        script: project.script,
      };
    }

    await this.videoProjectRepository.updateStatus(
      projectId,
      AI_VIDEO_PROJECT_STATUS.GENERATING,
      { errorMessage: null }
    );

    const startTime = Date.now();
    const promptText = topicPrompt || project.prompt || project.name;
    const projectLanguage = language || project.language || "en";
    const projectStyle = style || project.style || "cartoon";
    const projectDuration = targetDuration || project.duration || 30;

    const langInstruction = getLanguageInstruction(projectLanguage);

    const messages = [
      {
        role: "system",
        content: `You are an expert AI Video Script Director. Create a concise, clean short-form video production script (dialogue, narration, scene setup) for a ${projectDuration}-second video in language: ${projectLanguage}, visual style: ${projectStyle}. Do NOT include hashtags, markdown headers (###), horizontal dividers (---), or decorative metadata.\n\n${langInstruction}`,
      },
      {
        role: "user",
        content: `Topic / Prompt: "${promptText}". Write a clean, compelling production script with clear dialogue and scene beats for a ${projectDuration}-second video.`,
      },
    ];

    let provider;
    try {
      provider = typeof this.aiProviderFactory.getProvider === "function"
        ? await this.aiProviderFactory.getProvider()
        : this.aiProviderFactory;
    } catch (err) {
      const errCode = "AI_DIRECTOR_PROVIDER_UNAVAILABLE";
      await this.videoProjectRepository.updateStatus(projectId, AI_VIDEO_PROJECT_STATUS.FAILED, {
        errorMessage: `Failed to resolve AI Provider: ${err.message}`,
      });
      throw new AppError(`AI Provider error: ${err.message}`, 500, errCode);
    }

    try {
      let response = await provider.chat(messages, {
        temperature: 0.7,
        maxTokens: 4096,
        timeout: AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
      });

      let scriptContent = normalizeScriptContent(response);

      if (typeof scriptContent !== "string") {
        throw new AppError(
          "AI Director returned an invalid script response.",
          502,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      if (!scriptContent.trim()) {
        throw new AppError(
          "AI provider returned empty script response",
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      // Spoken Language Validation & Single Retry
      const isValidLang = validateSpokenLanguage(scriptContent, projectLanguage);
      if (!isValidLang) {
        console.warn("[AI_DIRECTOR_LANGUAGE_RETRY]", {
          projectId,
          language: projectLanguage,
        });

        const retryMessages = [
          ...messages,
          {
            role: "assistant",
            content: scriptContent,
          },
          {
            role: "user",
            content: `CRITICAL CORRECTION: The previous response contained English dialogue. The selected project language is "${projectLanguage}". Every spoken dialogue line and voiceover line MUST be written in "${projectLanguage}" script. Technical terms (e.g. AI, API, Flutter, bug, developer) and visual descriptions may remain in English, but spoken dialogue MUST be in "${projectLanguage}". Regenerate the script now obeying this requirement.`,
          },
        ];

        const retryResponse = await provider.chat(retryMessages, {
          temperature: 0.7,
          maxTokens: 4096,
          timeout: AI_VIDEO_AI_DIRECTOR_TIMEOUT_MS,
        });

        const retryScriptContent = normalizeScriptContent(retryResponse);

        if (
          typeof retryScriptContent === "string" &&
          retryScriptContent.trim() &&
          validateSpokenLanguage(retryScriptContent, projectLanguage)
        ) {
          scriptContent = retryScriptContent;
        } else {
          throw new AppError(
            `Generated script violated selected language (${projectLanguage}) requirements. Spoken dialogue must be in ${projectLanguage}.`,
            422,
            "AI_DIRECTOR_LANGUAGE_MISMATCH"
          );
        }
      }

      const updatedProject = await this.videoProjectRepository.update(projectId, {
        script: scriptContent.trim(),
        status: AI_VIDEO_PROJECT_STATUS.READY,
        errorMessage: null,
      });

      console.log(`[AI VIDEO][SCRIPT]\nprojectId=${projectId}\nstatus=${AI_VIDEO_PROJECT_STATUS.READY}\nscriptLength=${scriptContent.trim().length}`);

      console.log("[AI_DIRECTOR_SCRIPT_SUCCESS]", {
        provider: provider.name || "default",
        projectId,
        organizationId,
        durationMs: Date.now() - startTime,
      });

      return {
        project: updatedProject,
        script: scriptContent.trim(),
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const isTimeout = error.code === "AI_DIRECTOR_TIMEOUT" || error.message?.includes("timed out");
      const errorCode = isTimeout ? "AI_DIRECTOR_TIMEOUT" : (error.errorCode || error.code || "AI_DIRECTOR_GENERATION_FAILED");

      console.error("[AI_DIRECTOR_SCRIPT_FAILED]", {
        provider: provider?.name || "unknown",
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
      throw new AppError(`Script generation failed: ${error.message}`, 500, errorCode);
    }
  }
}
