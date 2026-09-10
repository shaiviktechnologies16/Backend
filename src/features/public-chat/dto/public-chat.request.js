export class PublicChatRequest {
  constructor({ message, conversationId = null }) {
    this.message = message;
    this.conversationId = conversationId;
  }

  static from(body) {
    return new PublicChatRequest({
      message: body.message,
      conversationId: body.conversationId,
    });
  }
}
