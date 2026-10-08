import { SubtitleProvider } from "../../domain/providers/subtitle.provider.js";

export class PlaceholderSubtitleProvider extends SubtitleProvider {
  get name() {
    return "placeholder-subtitle-provider";
  }

  async generateSubtitles({
    audioUrl,
    dialogue = null,
    language = "en",
    options = {},
  }) {
    const jobId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mockSrt = `1\n00:00:00,000 --> 00:00:05,000\n${dialogue || "Sample dialogue subtitle"}`;
    const mockUrl = `https://assets.shaivik.ai/generated/subtitles/${jobId}.srt`;

    return {
      provider: this.name,
      providerJobId: jobId,
      status: "COMPLETED",
      assetUrl: mockUrl,
      srtContent: mockSrt,
      metadata: { audioUrl, dialogue, language, ...options },
      error: null,
    };
  }
}
