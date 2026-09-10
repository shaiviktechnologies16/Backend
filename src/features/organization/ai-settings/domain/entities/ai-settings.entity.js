import { randomUUID } from "crypto";

export class AISettings {
  constructor({
    id = randomUUID(),
    organizationId,
    defaultInstructions = null,
    conversationRules = null,
    tone = "professional",
    responseStyle = "balanced",
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.defaultInstructions = defaultInstructions;
    this.conversationRules = conversationRules;
    this.tone = tone;
    this.responseStyle = responseStyle;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  update({ defaultInstructions, conversationRules, tone, responseStyle }) {
    if (defaultInstructions !== undefined) {
      this.defaultInstructions = defaultInstructions;
    }

    if (conversationRules !== undefined) {
      this.conversationRules = conversationRules;
    }

    if (tone !== undefined) {
      this.tone = tone;
    }

    if (responseStyle !== undefined) {
      this.responseStyle = responseStyle;
    }

    this.updatedAt = new Date();
  }
}
