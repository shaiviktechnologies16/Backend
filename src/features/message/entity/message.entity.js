import crypto from "crypto";

export class Message {
  constructor({
    id = crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.conversationId = conversationId;
    this.role = role;
    this.content = content;
    this.createdAt = createdAt;
  }
}
