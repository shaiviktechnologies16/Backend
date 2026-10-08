/**
 * Interface for Video Rendering & Composition Providers (FFmpeg / Cloud Renderer).
 */
export class VideoRenderer {
  get name() {
    throw new Error("Method 'name' must be implemented.");
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
    throw new Error("Method 'render' must be implemented.");
  }
}
