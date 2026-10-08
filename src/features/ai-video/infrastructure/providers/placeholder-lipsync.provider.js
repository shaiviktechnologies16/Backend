import { LipSyncProvider } from "../../domain/providers/lip-sync.provider.js";

export class PlaceholderLipSyncProvider extends LipSyncProvider {
  get name() {
    return "placeholder-lipsync-provider";
  }

  async generateLipSync({
    videoUrl,
    audioUrl,
    characterId = null,
    options = {},
  }) {
    const jobId = `lipsync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockOutputUrl = videoUrl ? videoUrl.replace(/\.mp4$/, "_lipsynced.mp4") : `https://assets.shaivik.ai/generated/lipsync/${jobId}.mp4`;

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: mockOutputUrl,
      metadata: { videoUrl, audioUrl, characterId, ...options },
      error: null,
    };
  }
}
