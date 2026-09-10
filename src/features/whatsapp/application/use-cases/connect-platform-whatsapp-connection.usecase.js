import { AppError } from "../../../../common/errors/AppError.js";
import envConfig from "../../../../config/env.config.js";

export class ConnectPlatformWhatsappConnectionUseCase {
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

    if (connection.provider !== "EVOLUTION") {
      throw new AppError(
        "This connection does not use Evolution provider.",
        400,
        "INVALID_WHATSAPP_PROVIDER",
      );
    }

    const instanceName = connection.metadata?.evolution?.instanceName;

    if (!instanceName) {
      throw new AppError(
        "Evolution instance is not configured for this connection.",
        500,
        "EVOLUTION_INSTANCE_NOT_CONFIGURED",
      );
    }

    let instanceExists = false;

    try {
      const instance =
        await this.platformEvolutionWhatsappProvider.fetchInstance(
          instanceName,
        );

      instanceExists = true;
    } catch (error) {
      const status = error.response?.status;

      if (status !== 404) {
        throw error;
      }
    }

    if (!instanceExists) {
      await this.platformEvolutionWhatsappProvider.createInstance({
        instanceName,
        webhookUrl: envConfig.evolution.webhookUrl,
      });
    }

    const evolution =
      await this.platformEvolutionWhatsappProvider.getQrCode(instanceName);

    const updatedConnection =
      await this.platformWhatsappConnectionRepository.update(connection.id, {
        status: "CONNECTING",
      });

    return {
      connection: updatedConnection,
      evolution: {
        instanceName,
        pairingCode: evolution?.pairingCode || null,
        code: evolution?.code || null,
        base64: evolution?.base64 || null,
        count: evolution?.count ?? null,
      },
    };
  }
}
