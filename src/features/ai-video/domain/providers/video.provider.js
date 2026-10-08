/**
 * Interface for Video Generation Providers (Image-to-Video / Text-to-Video).
 */
export class VideoProvider {
  get name() {
    throw new Error("Method 'name' must be implemented.");
  }

  async generateVideo({
    prompt,
    imageUrl,
    duration = 5,
    aspectRatio = "9:16",
    style = "cartoon",
    options = {},
  }) {
    throw new Error("Method 'generateVideo' must be implemented.");
  }

  async getGenerationStatus(jobId) {
    throw new Error("Method 'getGenerationStatus' must be implemented.");
  }

  async cancelGeneration(jobId) {
    throw new Error("Method 'cancelGeneration' must be implemented.");
  }
}
