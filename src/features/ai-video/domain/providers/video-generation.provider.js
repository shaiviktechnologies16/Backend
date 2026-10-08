/**
 * Clean Architecture Interface for Video Generation Providers (Text-to-Video / Image-to-Video).
 */
export class VideoGenerationProvider {
  get name() {
    throw new Error("Method not implemented.");
  }

  get model() {
    throw new Error("Method not implemented.");
  }

  async generateVideo(input) {
    throw new Error("Method not implemented.");
  }

  async getGenerationStatus(jobId) {
    throw new Error("Method not implemented.");
  }

  async downloadVideo(jobId) {
    throw new Error("Method not implemented.");
  }
}
