import { VideoTTSProvider } from "../../domain/providers/video-tts.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";

/**
 * Adapter that connects the AI Video module to Shaivik AI's existing TTS system (IndicF5 / SynthesizeSpeechUseCase).
 */
export class ExistingTtsVideoAdapter extends VideoTTSProvider {
  constructor({ synthesizeSpeechUseCase }) {
    super();
    this.synthesizeSpeechUseCase = synthesizeSpeechUseCase;
  }

  get name() {
    return "indicf5-tts-adapter";
  }

  /**
   * Translates AI Video TTS request into existing Shaivik TTS request.
   */
  async generateSpeech({
    text,
    language = "en",
    voice = null,
    characterId = null,
    options = {},
  }) {
    if (!text || !text.trim()) {
      throw new AppError("Text is required for TTS speech synthesis", 400, "MISSING_TTS_TEXT");
    }

    if (!this.synthesizeSpeechUseCase) {
      throw new AppError("Existing TTS UseCase not injected into adapter", 500, "TTS_ADAPTER_ERROR");
    }

    const normalizedLanguage = ["te", "hi", "en"].includes(language) ? language : "en";

    try {
      const result = await this.synthesizeSpeechUseCase.execute({
        text: text.trim(),
        options: {
          language: normalizedLanguage,
          voice: voice || "default",
          characterId: characterId || null,
          ...options,
        },
      });

      const assetUrl = result?.outputPath || result?.url || result?.filename || null;
      const duration = result?.duration || Math.max(2, Math.ceil(text.trim().length / 15));

      return {
        provider: this.name,
        providerJobId: `tts-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: "COMPLETED",
        assetUrl,
        duration,
        mimeType: result?.mimeType || "audio/wav",
        metadata: {
          language: normalizedLanguage,
          characterId,
          rawResult: result,
        },
        error: null,
      };
    } catch (error) {
      return {
        provider: this.name,
        providerJobId: `tts-job-failed-${Date.now()}`,
        status: "FAILED",
        assetUrl: null,
        duration: 0,
        mimeType: null,
        metadata: { language: normalizedLanguage, characterId },
        error: error.message,
      };
    }
  }
}
