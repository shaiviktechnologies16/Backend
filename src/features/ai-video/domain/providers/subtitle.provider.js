/**
 * Interface for Subtitle Generation Providers.
 */
export class SubtitleProvider {
  get name() {
    throw new Error("Method 'name' must be implemented.");
  }

  async generateSubtitles({
    audioUrl,
    dialogue = null,
    language = "en",
    options = {},
  }) {
    throw new Error("Method 'generateSubtitles' must be implemented.");
  }
}
