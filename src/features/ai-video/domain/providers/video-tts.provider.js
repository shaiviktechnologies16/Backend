/**
 * Interface for Video TTS (Text-to-Speech) Providers.
 */
export class VideoTTSProvider {
  get name() {
    throw new Error("Method 'name' must be implemented.");
  }

  async generateSpeech({
    text,
    language = "en",
    voice = null,
    characterId = null,
    options = {},
  }) {
    throw new Error("Method 'generateSpeech' must be implemented.");
  }
}
