import { AppError } from "../../../../common/errors/AppError.js";

export class DeleteWhatsappConnectionUseCase {
  constructor({ whatsappConnectionRepository }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
  }

  async execute({ organizationId, connectionId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!connectionId) {
      throw new AppError(
        "WhatsApp connection ID is required.",
        400,
        "WHATSAPP_CONNECTION_ID_REQUIRED",
      );
    }

    const connection =
      await this.whatsappConnectionRepository.findById(connectionId);

    if (!connection) {
      throw new AppError(
        "WhatsApp connection not found.",
        404,
        "WHATSAPP_CONNECTION_NOT_FOUND",
      );
    }

    if (connection.organizationId !== organizationId) {
      throw new AppError(
        "WhatsApp connection does not belong to organization.",
        403,
        "INVALID_ORGANIZATION_WHATSAPP_CONNECTION",
      );
    }

    await this.whatsappConnectionRepository.delete(connectionId);

    return {
      id: connectionId,
      deleted: true,
    };
  }
}
