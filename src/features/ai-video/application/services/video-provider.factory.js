import { AppError } from "../../../../common/errors/AppError.js";
import { PlaceholderImageProvider } from "../../infrastructure/providers/placeholder-image.provider.js";
import { PlaceholderVideoProvider } from "../../infrastructure/providers/placeholder-video.provider.js";
import { PlaceholderLipSyncProvider } from "../../infrastructure/providers/placeholder-lipsync.provider.js";
import { PlaceholderSubtitleProvider } from "../../infrastructure/providers/placeholder-subtitle.provider.js";
import { PlaceholderRendererProvider } from "../../infrastructure/providers/placeholder-renderer.provider.js";
import { ExistingTtsVideoAdapter } from "../../infrastructure/tts/existing-tts-video.adapter.js";

import { OpenAiImageProvider } from "../../infrastructure/providers/openai-image.provider.js";
import { LocalVideoProvider } from "../../infrastructure/providers/local-video.provider.js";

/**
 * Registry and factory for resolving media generation providers in AI Video module.
 */
export class VideoProviderFactory {
  constructor({
    synthesizeSpeechUseCase = null,
    getPlatformApiKeyValueUseCase = null,
    storageProvider = null,
    uploadFileUseCase = null,
  } = {}) {
    this.imageProviders = new Map();
    this.videoProviders = new Map();
    this.ttsProviders = new Map();
    this.lipSyncProviders = new Map();
    this.subtitleProviders = new Map();
    this.renderers = new Map();

    // Register Default Providers
    const defaultPlaceholderImage = new PlaceholderImageProvider();
    const openAiImageProvider = new OpenAiImageProvider({
      getPlatformApiKeyValueUseCase,
      storageProvider,
      uploadFileUseCase,
    });
    const defaultVideo = new PlaceholderVideoProvider();
    const defaultLipSync = new PlaceholderLipSyncProvider();
    const defaultSubtitle = new PlaceholderSubtitleProvider();
    const defaultRenderer = new PlaceholderRendererProvider();

    // Set OpenAI as real image provider option, placeholder as default/fallback
    this.imageProviders.set("default", openAiImageProvider);
    this.imageProviders.set(openAiImageProvider.name, openAiImageProvider);
    this.imageProviders.set("openai", openAiImageProvider);
    this.imageProviders.set("placeholder", defaultPlaceholderImage);
    this.imageProviders.set(defaultPlaceholderImage.name, defaultPlaceholderImage);

    const localVideoProvider = new LocalVideoProvider({
      baseUrl: process.env.VIDEO_GENERATION_BASE_URL,
      model: process.env.VIDEO_MODEL,
      apiKey: process.env.VIDEO_GENERATION_API_KEY,
      timeoutMs: process.env.VIDEO_GENERATION_TIMEOUT_MS,
      storageProvider,
      uploadFileUseCase,
    });

    const isLocalVideo = (process.env.VIDEO_PROVIDER || "local").toLowerCase() === "local";
    const primaryVideoProvider = isLocalVideo ? localVideoProvider : defaultVideo;

    this.videoProviders.set("default", primaryVideoProvider);
    this.videoProviders.set("local", localVideoProvider);
    this.videoProviders.set(localVideoProvider.name, localVideoProvider);
    this.videoProviders.set("placeholder", defaultVideo);
    this.videoProviders.set(defaultVideo.name, defaultVideo);

    this.lipSyncProviders.set("default", defaultLipSync);
    this.lipSyncProviders.set(defaultLipSync.name, defaultLipSync);

    this.subtitleProviders.set("default", defaultSubtitle);
    this.subtitleProviders.set(defaultSubtitle.name, defaultSubtitle);

    this.renderers.set("default", defaultRenderer);
    this.renderers.set(defaultRenderer.name, defaultRenderer);

    if (synthesizeSpeechUseCase) {
      const existingTtsAdapter = new ExistingTtsVideoAdapter({ synthesizeSpeechUseCase });
      this.ttsProviders.set("default", existingTtsAdapter);
      this.ttsProviders.set(existingTtsAdapter.name, existingTtsAdapter);
    }
  }

  registerProvider(type, name, providerInstance) {
    if (!type || !name || !providerInstance) {
      throw new AppError("Type, name, and provider instance are required for registration", 400, "INVALID_PROVIDER_REGISTRATION");
    }

    switch (type.toLowerCase()) {
      case "image":
        this.imageProviders.set(name, providerInstance);
        break;
      case "video":
        this.videoProviders.set(name, providerInstance);
        break;
      case "tts":
        this.ttsProviders.set(name, providerInstance);
        break;
      case "lipsync":
        this.lipSyncProviders.set(name, providerInstance);
        break;
      case "subtitle":
        this.subtitleProviders.set(name, providerInstance);
        break;
      case "renderer":
        this.renderers.set(name, providerInstance);
        break;
      default:
        throw new AppError(`Unsupported provider type: ${type}`, 400, "UNSUPPORTED_PROVIDER_TYPE");
    }
  }

  getImageProvider(name = "default") {
    const provider = this.imageProviders.get(name) || this.imageProviders.get("default");
    if (!provider) {
      throw new AppError(`Image provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }

  getVideoProvider(name = "default") {
    const provider = this.videoProviders.get(name) || this.videoProviders.get("default");
    if (!provider) {
      throw new AppError(`Video provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }

  getTTSProvider(name = "default") {
    const provider = this.ttsProviders.get(name) || this.ttsProviders.get("default");
    if (!provider) {
      throw new AppError(`TTS provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }

  getLipSyncProvider(name = "default") {
    const provider = this.lipSyncProviders.get(name) || this.lipSyncProviders.get("default");
    if (!provider) {
      throw new AppError(`LipSync provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }

  getSubtitleProvider(name = "default") {
    const provider = this.subtitleProviders.get(name) || this.subtitleProviders.get("default");
    if (!provider) {
      throw new AppError(`Subtitle provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }

  getRenderer(name = "default") {
    const provider = this.renderers.get(name) || this.renderers.get("default");
    if (!provider) {
      throw new AppError(`Renderer provider '${name}' not found`, 404, "PROVIDER_NOT_FOUND");
    }
    return provider;
  }
}
