import OpenAI, { toFile } from "openai";
import { VideoImageProvider } from "../../domain/providers/video-image.provider.js";
import { VideoImagePromptBuilder } from "../../domain/services/video-image-prompt.builder.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { UploadPurpose } from "../../../upload/domain/constants/upload-purpose.js";

/**
 * Production OpenAI DALL-E image generation provider for AI Video module.
 */
export class OpenAiImageProvider extends VideoImageProvider {
  constructor({
    getPlatformApiKeyValueUseCase = null,
    storageProvider = null,
    uploadFileUseCase = null,
  } = {}) {
    super();
    this.getPlatformApiKeyValueUseCase = getPlatformApiKeyValueUseCase;
    this.storageProvider = storageProvider;
    this.uploadFileUseCase = uploadFileUseCase;
  }

  get name() {
    return "openai-image-provider";
  }

  get defaultModel() {
    return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  }

  get capabilities() {
    return {
      referenceImages: true,
      responseFormat: false,
    };
  }

  /**
   * Only legacy dall-e-2 natively accepts response_format without triggering 400 Unknown parameter.
   * dall-e-3, gpt-image-1, and modern image models reject response_format.
   */
  supportsResponseFormat(model) {
    if (!model) return false;
    const m = String(model).toLowerCase();
    return m === "dall-e-2";
  }

  /**
   * Only dall-e-3 supports quality ('standard' | 'hd').
   */
  supportsQuality(model) {
    if (!model) return false;
    const m = String(model).toLowerCase();
    return m === "dall-e-3";
  }

  /**
   * Resolves an authenticated OpenAI client using platform API keys or env.
   */
  async getClient() {
    let apiKey = process.env.OPENAI_API_KEY;

    if (this.getPlatformApiKeyValueUseCase) {
      try {
        const platformKey =
          await this.getPlatformApiKeyValueUseCase.execute("openai");
        if (platformKey) {
          apiKey = platformKey;
        }
      } catch (err) {
        // Fall back to process.env if platform key resolution fails
      }
    }

    if (!apiKey) {
      throw new AppError(
        "OpenAI API key is missing or unconfigured",
        400,
        "AI_IMAGE_PROVIDER_NOT_CONFIGURED",
      );
    }

    return new OpenAI({ apiKey });
  }

  /**
   * Validates reference image URL against SSRF threats and private network targets.
   */
  validateUrlForSsrf(urlString) {
    if (!urlString) return;
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch (err) {
      throw new AppError(
        "Invalid reference image URL format",
        400,
        "REFERENCE_IMAGE_UNAVAILABLE",
      );
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new AppError(
        "Invalid reference image URL protocol",
        400,
        "REFERENCE_IMAGE_UNAVAILABLE",
      );
    }

    const hostname = parsed.hostname.toLowerCase();
    const isPrivate =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (isPrivate) {
      throw new AppError(
        "Access to internal or private IP address is forbidden",
        403,
        "REFERENCE_IMAGE_UNAVAILABLE",
      );
    }
  }

  /**
   * Downloads reference image into buffer with SSRF protection.
   */
  async fetchReferenceImageBuffer(url) {
    this.validateUrlForSsrf(url);
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        throw new AppError(
          `Reference image download failed with HTTP status ${res.status}`,
          404,
          "REFERENCE_IMAGE_UNAVAILABLE",
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Reference image fetch failed: ${err.message}`,
        404,
        "REFERENCE_IMAGE_UNAVAILABLE",
      );
    }
  }

  /**
   * Normalizes provider image item structure into URL or base64 data.
   */
  extractImageData(item) {
    if (!item) return null;
    if (typeof item === "string") {
      return { rawUrl: item, b64Json: null };
    }
    if (item.url) {
      return { rawUrl: item.url, b64Json: null };
    }
    if (item.b64_json) {
      return { rawUrl: null, b64Json: item.b64_json };
    }
    if (item.base64) {
      return { rawUrl: null, b64Json: item.base64 };
    }
    if (item.image) {
      if (typeof item.image === "string" && item.image.startsWith("http")) {
        return { rawUrl: item.image, b64Json: null };
      }
      return { rawUrl: null, b64Json: item.image };
    }
    return null;
  }

  /**
   * Downloads raw generated image bytes or decodes base64 and uploads to Shaivik permanent storage.
   */
  async storeGeneratedImagePermanently({
    rawUrl = null,
    b64Json = null,
    organizationId,
    projectId,
    options = {},
  }) {
    if (!rawUrl && !b64Json) {
      throw new AppError(
        "No image data provided for storage",
        500,
        "IMAGE_ASSET_STORAGE_FAILED",
      );
    }

    if (!this.storageProvider && !this.uploadFileUseCase) {
      return rawUrl || `data:image/png;base64,${b64Json}`;
    }

    let imgBuffer = null;
    if (b64Json) {
      try {
        imgBuffer = Buffer.from(b64Json, "base64");
      } catch (bufErr) {
        throw new AppError(
          `Failed to decode base64 image data: ${bufErr.message}`,
          500,
          "IMAGE_ASSET_STORAGE_FAILED",
        );
      }
    } else if (rawUrl) {
      try {
        const imgRes = await fetch(rawUrl, {
          signal: AbortSignal.timeout(15000),
        });
        if (!imgRes.ok) {
          throw new AppError(
            `Failed to download generated image asset (HTTP ${imgRes.status})`,
            500,
            "IMAGE_ASSET_DOWNLOAD_FAILED",
          );
        }
        imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          `Failed to download generated image asset: ${err.message}`,
          500,
          "IMAGE_ASSET_DOWNLOAD_FAILED",
        );
      }
    }

    if (!imgBuffer || imgBuffer.length === 0) {
      throw new AppError(
        "Generated image buffer is empty",
        500,
        "IMAGE_ASSET_STORAGE_FAILED",
      );
    }

    try {
      if (this.storageProvider) {
        const storedFile = await this.storageProvider.upload({
          buffer: imgBuffer,
          originalName: `scene-image-${Date.now()}.png`,
          mimeType: "image/png",
          purpose: UploadPurpose.AI_VIDEO_SCENE_IMAGE,
          organizationId,
          projectId,
        });
        return storedFile.url;
      } else if (this.uploadFileUseCase) {
        const uploadRecord = await this.uploadFileUseCase.execute({
          userId: options.userId || "system",
          purpose: UploadPurpose.AI_VIDEO_SCENE_IMAGE,
          organizationId,
          projectId,
          file: {
            buffer: imgBuffer,
            originalname: `scene-image-${Date.now()}.png`,
            mimetype: "image/png",
            size: imgBuffer.length,
          },
        });
        return uploadRecord.storageUrl;
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Failed to save generated image to permanent storage: ${err.message}`,
        500,
        "IMAGE_ASSET_STORAGE_FAILED",
      );
    }

    return rawUrl || `data:image/png;base64,${b64Json}`;
  }

  /**
   * Maps normalized aspect ratio to OpenAI supported image dimensions.
   */
  mapAspectRatioToSize(aspectRatio, model = "dall-e-3") {
    const isDalle2 = String(model).toLowerCase() === "dall-e-2";
    if (isDalle2) {
      return { size: "1024x1024", width: 1024, height: 1024 };
    }
    switch (aspectRatio) {
      case "9:16":
        return { size: "1024x1792", width: 1024, height: 1792 };
      case "16:9":
        return { size: "1792x1024", width: 1792, height: 1024 };
      case "1:1":
        return { size: "1024x1024", width: 1024, height: 1024 };
      default:
        return { size: "1024x1792", width: 1024, height: 1792 };
    }
  }

  /**
   * Executes real image generation via OpenAI API.
   */
  async generateImage({
    prompt,
    referenceImageUrl = null,
    referenceImages = [],
    aspectRatio = "9:16",
    style = "3d-cartoon",
    characters = [],
    organizationId = null,
    projectId = null,
    options = {},
  }) {
    if (!prompt && !options.visualPrompt && !options.projectName) {
      throw new AppError(
        "Visual prompt is required for image generation",
        400,
        "IMAGE_GENERATION_INVALID_REQUEST",
      );
    }

    const client = await this.getClient();

    const primaryRefUrl = referenceImages[0]?.url || referenceImageUrl || null;

    const constructedPrompt = VideoImagePromptBuilder.buildPrompt({
      visualPrompt: prompt || options.visualPrompt,
      projectPrompt: options.projectPrompt,
      projectName: options.projectName,
      style,
      aspectRatio,
      characters,
      referenceImageUrl: primaryRefUrl,
      referenceImages,
    });

    const model = options.model || this.defaultModel;
    const { size, width, height } = this.mapAspectRatioToSize(aspectRatio, model);
    const quality = options.quality || "standard";

    let referenceBuffer = null;
    if (primaryRefUrl) {
      try {
        referenceBuffer = await this.fetchReferenceImageBuffer(primaryRefUrl);
      } catch (refFetchErr) {
        console.warn("[AI VIDEO][SCENE IMAGE][REFERENCE_UNAVAILABLE]", {
          reason: refFetchErr.message,
          fallback: "Proceeding with prompt-only image generation",
        });
        referenceBuffer = null;
      }
    }

    let responseImage = null;
    let revisedPrompt = constructedPrompt;

    if (referenceBuffer) {
      try {
        const fileObject = await toFile(referenceBuffer, "reference.png", {
          type: "image/png",
        });
        const editPayload = {
          image: fileObject,
          prompt: constructedPrompt,
          n: 1,
          size: "1024x1024",
        };
        // Only include response_format if model explicitly supports it
        if (this.supportsResponseFormat("dall-e-2") && options.response_format) {
          editPayload.response_format = options.response_format;
        }

        const editResponse = await client.images.edit(editPayload);
        const editData = this.extractImageData(editResponse?.data?.[0]);
        if (editData) {
          responseImage = editData;
        }
      } catch (editErr) {
        // Fall back to client.images.generate if edit call is unsupported or fails non-fatal
      }
    }

    if (!responseImage) {
      try {
        const generatePayload = {
          model,
          prompt: constructedPrompt,
          n: 1,
        };

        if (size) {
          generatePayload.size = size;
        }

        if (this.supportsQuality(model)) {
          generatePayload.quality = quality;
        }

        // Only include response_format if model explicitly supports it
        if (this.supportsResponseFormat(model) && options.response_format) {
          generatePayload.response_format = options.response_format;
        }

        const response = await client.images.generate(generatePayload);

        const generatedData = this.extractImageData(response?.data?.[0]);
        if (!generatedData) {
          throw new AppError(
            "OpenAI returned an empty image generation response",
            500,
            "IMAGE_GENERATION_FAILED",
          );
        }
        responseImage = generatedData;
        revisedPrompt = response?.data?.[0]?.revised_prompt || constructedPrompt;
      } catch (err) {
        this.handleOpenAiError(err);
      }
    }

    // Upload generated image bytes to permanent storage
    const permanentAssetUrl = await this.storeGeneratedImagePermanently({
      rawUrl: responseImage.rawUrl,
      b64Json: responseImage.b64Json,
      organizationId,
      projectId,
      options,
    });

    const jobId = `openai-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: permanentAssetUrl,
      imageUrl: permanentAssetUrl,
      model,
      metadata: {
        prompt: constructedPrompt,
        revisedPrompt,
        aspectRatio,
        width,
        height,
        style,
        model,
        quality: this.supportsQuality(model) ? quality : undefined,
        size,
      },
      error: null,
    };
  }

  handleOpenAiError(err) {
    if (err instanceof AppError) {
      throw err;
    }

    const message = err.message || "Failed to generate image from OpenAI";
    const messageLower = message.toLowerCase();

    if (
      messageLower.includes("safety") ||
      messageLower.includes("content_policy") ||
      messageLower.includes("rejected")
    ) {
      throw new AppError(
        `Image generation rejected by safety filter: ${message}`,
        400,
        "IMAGE_GENERATION_REJECTED",
      );
    }

    if (
      messageLower.includes("rate limit") ||
      messageLower.includes("quota")
    ) {
      throw new AppError(
        `OpenAI image rate limit or quota exceeded: ${message}`,
        429,
        "IMAGE_GENERATION_LIMIT_EXCEEDED",
      );
    }

    if (
      messageLower.includes("timeout") ||
      messageLower.includes("timed out")
    ) {
      throw new AppError(
        `OpenAI image generation request timed out: ${message}`,
        408,
        "AI_IMAGE_TIMEOUT",
      );
    }

    throw new AppError(
      `Image generation failed: ${message}`,
      500,
      "AI_IMAGE_GENERATION_FAILED",
    );
  }
}

