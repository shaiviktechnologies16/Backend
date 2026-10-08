import { VideoRenderer } from "../../domain/providers/video-renderer.provider.js";

export class PlaceholderRendererProvider extends VideoRenderer {
  get name() {
    return "placeholder-renderer-provider";
  }

  async render({
    scenes = [],
    audioTracks = [],
    subtitles = [],
    music = null,
    sfx = [],
    aspectRatio = "9:16",
    fps = 30,
    options = {},
  }) {
    const jobId = `render-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockOutputUrl = `https://assets.shaivik.ai/generated/final/${jobId}.mp4`;
    const calculatedDuration = scenes.reduce((total, s) => total + (s.duration || 5), 0);

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: mockOutputUrl,
      duration: calculatedDuration,
      metadata: { sceneCount: scenes.length, aspectRatio, fps, ...options },
      error: null,
    };
  }
}
