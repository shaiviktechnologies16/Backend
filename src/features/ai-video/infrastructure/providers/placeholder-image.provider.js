import { VideoImageProvider } from "../../domain/providers/video-image.provider.js";

export class PlaceholderImageProvider extends VideoImageProvider {
  get name() {
    return "placeholder-image-provider";
  }

  get defaultModel() {
    return "mock-image-v1";
  }

  get capabilities() {
    return {
      referenceImages: true,
      responseFormat: false,
    };
  }

  async generateImage({
    prompt,
    referenceImageUrl = null,
    referenceImages = [],
    aspectRatio = "9:16",
    style = "cartoon",
    width = 1080,
    height = 1920,
    characters = [],
    options = {},
  }) {
    const primaryRefUrl = referenceImages[0]?.url || referenceImageUrl || null;
    const jobId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockUrl = primaryRefUrl || `https://assets.shaivik.ai/generated/images/${jobId}.png`;

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: mockUrl,
      metadata: {
        prompt,
        aspectRatio,
        style,
        width,
        height,
        characters,
        referenceImages,
        referenceImageUrl: primaryRefUrl,
        ...options,
      },
      error: null,
    };
  }
}
