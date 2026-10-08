import { ValidationError } from "../../../../common/errors/ValidationError.js";
import {
  AI_VIDEO_ASPECT_RATIO,
  AI_VIDEO_LANGUAGE,
  AI_VIDEO_SCENE_STATUS,
} from "../../domain/constants/ai-video.constants.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AiVideoValidator {
  static validateUUID(id, paramName = "ID") {
    if (!id || typeof id !== "string" || (!UUID_REGEX.test(id) && !id.startsWith("proj-") && !id.startsWith("char-") && !id.startsWith("scene-"))) {
      throw new ValidationError(`Invalid ${paramName} format.`);
    }
  }

  static validateCreateProjectInput(body) {
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body is required.");
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new ValidationError("Project name is required.");
    }

    if (body.language && !Object.values(AI_VIDEO_LANGUAGE).includes(body.language)) {
      throw new ValidationError(`Invalid language. Allowed: ${Object.values(AI_VIDEO_LANGUAGE).join(", ")}`);
    }

    if (body.aspectRatio && !Object.values(AI_VIDEO_ASPECT_RATIO).includes(body.aspectRatio)) {
      throw new ValidationError(`Invalid aspect ratio. Allowed: ${Object.values(AI_VIDEO_ASPECT_RATIO).join(", ")}`);
    }

    if (body.duration !== undefined && (isNaN(Number(body.duration)) || Number(body.duration) <= 0)) {
      throw new ValidationError("Duration must be a positive number.");
    }
  }

  static validateCreateCharacterInput(body) {
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body is required.");
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new ValidationError("Character name is required.");
    }
  }

  static validateCreateSceneInput(body) {
    if (body && body.duration !== undefined && (isNaN(Number(body.duration)) || Number(body.duration) <= 0)) {
      throw new ValidationError("Duration must be a positive number.");
    }
  }

  static validateUpdateSceneStatusInput(body) {
    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body is required.");
    }

    if (!body.status || !Object.values(AI_VIDEO_SCENE_STATUS).includes(body.status)) {
      throw new ValidationError(`Invalid status. Allowed: ${Object.values(AI_VIDEO_SCENE_STATUS).join(", ")}`);
    }
  }

  static validatePaginationInput(query) {
    if (query.page !== undefined && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
      throw new ValidationError("Page must be an integer >= 1.");
    }
    if (query.limit !== undefined && (isNaN(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
      throw new ValidationError("Limit must be an integer between 1 and 100.");
    }
  }
}
