export class ChatResponse {
  constructor({
    reply,
    model,
    provider,
    conversationId = null,
    tokens = null,
    sources = [],
  }) {
    this.reply = reply;
    this.model = model;
    this.provider = provider;
    this.conversationId = conversationId;
    this.tokens = tokens;
    this.sources = sources;
  }

  static from(data) {
    return new ChatResponse(data);
  }
}
