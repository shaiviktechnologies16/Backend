import { ValidationError } from "../../../common/errors/ValidationError.js";

export class ChatRequest {
  constructor(body) {
    this.projectId = body.projectId ?? null;
    this.agentId = body.agentId ?? null;
    this.conversationId = body.conversationId ?? null;
    this.message = body.message;
  }

  static from(body) {
    const request = new ChatRequest(body);
    request.validate();

    return request;
  }

  validate() {
    if (this.projectId !== null && typeof this.projectId !== "string") {
      throw new ValidationError("projectId must be a string.");
    }

    if (this.agentId !== null && typeof this.agentId !== "string") {
      throw new ValidationError("agentId must be a string.");
    }

    if (
      this.conversationId !== null &&
      typeof this.conversationId !== "string"
    ) {
      throw new ValidationError("conversationId must be a string.");
    }

    if (typeof this.message !== "string") {
      throw new ValidationError("Message must be a string.");
    }

    this.message = this.message.trim();

    if (!this.message) {
      throw new ValidationError("Message is required.");
    }

    if (this.message.length > 5000) {
      throw new ValidationError("Message is too long.");
    }
  }
}
