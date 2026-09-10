import { AppError } from "../../../../common/errors/AppError.js";

export class UpdatePlatformWhatsappConnectionUseCase {
  constructor({ platformWhatsappConnectionRepository }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;
  }

  async execute({ connectionId, data }) {
    if (!connectionId) {
      throw new AppError(
        "WhatsApp connection ID is required.",
        400,
        "WHATSAPP_CONNECTION_ID_REQUIRED",
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

    const allowedFields = [
      "name",
      "phoneNumber",
      "status",
      "qualityRating",
      "credentials",
      "metadata",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        "No valid fields provided for update.",
        400,
        "NO_VALID_UPDATE_FIELDS",
      );
    }

    return this.platformWhatsappConnectionRepository.update(
      connectionId,
      updateData,
    );
  }
}
