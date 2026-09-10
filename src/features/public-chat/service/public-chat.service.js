import { AppError } from "../../../common/errors/AppError.js";

export class PublicChatService {
  constructor({ conversationService }) {
    this.conversationService = conversationService;
  }

  async sendMessage(publicKey, request, visitorId) {
    return this.conversationService.sendPublicMessage(
      publicKey,
      request.message,
      visitorId,
      request.conversationId,
    );
  }

  async streamMessage(publicKey, request, visitorId) {
    return this.conversationService.streamPublicMessage(
      publicKey,
      request.message,
      visitorId,
      request.conversationId,
    );
  }
}
