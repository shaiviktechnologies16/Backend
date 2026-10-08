import { VideoProvider } from "../../domain/providers/video.provider.js";

export class PlaceholderVideoProvider extends VideoProvider {
  get name() {
    return "placeholder-video-provider";
  }

  get model() {
    return "placeholder-video-v1";
  }

  async generateVideo({
    prompt,
    imageUrl,
    duration = 5,
    aspectRatio = "9:16",
    style = "cartoon",
    options = {},
  }) {
    const jobId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockVideoUrl = `https://assets.shaivik.ai/generated/videos/${jobId}.mp4`;

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: mockVideoUrl,
      thumbnailUrl: imageUrl || `https://assets.shaivik.ai/generated/thumbnails/${jobId}.png`,
      duration,
      metadata: { prompt, imageUrl, aspectRatio, style, ...options },
      error: null,
    };
  }

  async getGenerationStatus(jobId) {
    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      progress: 100,
    };
  }

  async cancelGeneration(jobId) {
    return {
      provider: this.name,
      providerJobId: jobId,
      status: "CANCELLED",
    };
  }

  async downloadVideo(jobId) {
    return Buffer.from(`mock-video-bytes-${jobId}`);
  }
}
