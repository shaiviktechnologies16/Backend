/**
 * Interface for Video Image Providers (Text-to-Image / Image-to-Image).
 */
export class VideoImageProvider {
  get name() {
    throw new Error("Method 'name' must be implemented.");
  }

  get defaultModel() {
    return "default-image-model";
  }

  get capabilities() {
    return {
      referenceImages: false,
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
    options = {},
  }) {
    throw new Error("Method 'generateImage' must be implemented.");
  }
}
