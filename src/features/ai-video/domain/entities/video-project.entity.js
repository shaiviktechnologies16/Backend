import {
  AI_VIDEO_PROJECT_STATUS,
  AI_VIDEO_ASPECT_RATIO,
  AI_VIDEO_LANGUAGE,
} from "../constants/ai-video.constants.js";

export class VideoProject {
  constructor({
    id = null,
    organizationId,
    projectId = null,
    createdById,
    name,
    prompt,
    language = AI_VIDEO_LANGUAGE.TELUGU,
    aspectRatio = AI_VIDEO_ASPECT_RATIO.PORTRAIT_9_16,
    duration = 30,
    style = "cartoon",
    status = AI_VIDEO_PROJECT_STATUS.DRAFT,
    script = null,
    storyboard = null,
    finalVideoUrl = null,
    errorMessage = null,
    metadata = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.createdById = createdById;
    this.name = name;
    this.prompt = prompt;
    this.language = language;
    this.aspectRatio = aspectRatio;
    this.duration = duration;
    this.style = style;
    this.status = status;
    this.script = script;
    this.storyboard = storyboard;
    this.finalVideoUrl = finalVideoUrl;
    this.errorMessage = errorMessage;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
