import { AppError } from "../../../../common/errors/AppError.js";

export class DeletePlatformWhatsappConnectionUseCase {
  constructor({
    platformWhatsappConnectionRepository,
    platformEvolutionWhatsappProvider,
  }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;

    this.platformEvolutionWhatsappProvider = platformEvolutionWhatsappProvider;
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

    const instanceName = connection.metadata?.evolution?.instanceName;

    if (instanceName) {
      try {
        await this.platformEvolutionWhatsappProvider.logout(instanceName);
      } catch (error) {
        console.warn(
          `[PLATFORM WHATSAPP] Failed to logout Evolution instance ${instanceName}`,
          error?.response?.data || error?.message,
        );
      }

      try {
        await this.platformEvolutionWhatsappProvider.deleteInstance(
          instanceName,
        );
      } catch (error) {
        console.warn(
          `[PLATFORM WHATSAPP] Failed to delete Evolution instance ${instanceName}`,
          error?.response?.data || error?.message,
        );
      }
    }

    await this.platformWhatsappConnectionRepository.delete(connectionId);

    return {
      id: connectionId,
      deleted: true,
    };
  }
}
