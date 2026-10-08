/**
 * Interface for Lip Sync Video Providers.
 */
export class LipSyncProvider {
  get name() {
    throw new Error("Method 'name' must be implemented.");
  }

  async generateLipSync({
    videoUrl,
    audioUrl,
    characterId = null,
    options = {},
  }) {
    throw new Error("Method 'generateLipSync' must be implemented.");
  }
}
