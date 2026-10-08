import { AI_VIDEO_SCENE_STATUS } from "../constants/ai-video.constants.js";

export class VideoScene {
  constructor({
    id = null,
    videoProjectId,
    sceneNumber,
    duration = 5,
    visualPrompt = null,
    motionPrompt = null,
    dialogue = null,
    speaker = null,
    characterIds = [],
    referenceImageUrl = null,
    videoUrl = null,
    audioUrl = null,
    status = AI_VIDEO_SCENE_STATUS.PENDING,
    errorMessage = null,
    metadata = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.videoProjectId = videoProjectId;
    this.sceneNumber = sceneNumber;
    this.duration = duration;
    this.visualPrompt = visualPrompt;
    this.motionPrompt = motionPrompt;
    this.dialogue = dialogue;
    this.speaker = speaker;
    this.characterIds = characterIds;
    this.referenceImageUrl = referenceImageUrl;
    this.videoUrl = videoUrl;
    this.audioUrl = audioUrl;
    this.status = status;
    this.errorMessage = errorMessage;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
