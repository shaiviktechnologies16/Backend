import { AppError } from "../../../../common/errors/AppError.js";

export class GetPlatformWhatsappConnectionUseCase {
  constructor({ platformWhatsappConnectionRepository }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;
  }

  async execute({ connectionId }) {
    if (!connectionId) {
      throw new AppError(
        "Platform WhatsApp connection ID is required.",
        400,
        "PLATFORM_WHATSAPP_CONNECTION_ID_REQUIRED",
      );
    }

    const connection =
      await this.platformWhatsappConnectionRepository.findById(connectionId);

    if (!connection) {
      throw new AppError(
        "Platform WhatsApp connection not found.",
        404,
        "PLATFORM_WHATSAPP_CONNECTION_NOT_FOUND",
      );
    }

    return connection;
  }
}
