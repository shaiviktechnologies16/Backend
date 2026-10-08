import { AI_VIDEO_ASSET_TYPE } from "../constants/ai-video.constants.js";

export class VideoAsset {
  constructor({
    id = null,
    videoProjectId,
    sceneId = null,
    type = AI_VIDEO_ASSET_TYPE.IMAGE,
    provider = "system",
    url,
    storageKey = null,
    mimeType = null,
    size = null,
    metadata = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.videoProjectId = videoProjectId;
    this.sceneId = sceneId;
    this.type = type;
    this.provider = provider;
    this.url = url;
    this.storageKey = storageKey;
    this.mimeType = mimeType;
    this.size = size;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
