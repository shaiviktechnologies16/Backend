import { ValidationError } from "../../../../common/errors/ValidationError.js";

export class ProjectMemberValidator {
  static validateCreate(body) {
    if (!body.userId) {
      throw new ValidationError("userId is required.");
    }

    if (body.role && typeof body.role !== "string") {
      throw new ValidationError("role must be a string.");
    }

    return body;
  }

  static validateUpdate(body) {
    if (!body.role) {
      throw new ValidationError("role is required.");
    }

    return body;
  }
}
