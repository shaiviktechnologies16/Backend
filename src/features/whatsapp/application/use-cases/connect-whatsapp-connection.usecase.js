import { AppError } from "../../../../common/errors/AppError.js";
import envConfig from "../../../../config/env.config.js";

export class ConnectWhatsappConnectionUseCase {
  constructor({ whatsappConnectionRepository, evolutionWhatsappProvider }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.evolutionWhatsappProvider = evolutionWhatsappProvider;
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

    if (connection.provider !== "EVOLUTION") {
      throw new AppError(
        "This connection does not use Evolution provider.",
        400,
        "INVALID_WHATSAPP_PROVIDER",
      );
    }

    const instanceName =
      connection.metadata?.evolution?.instanceName ||
      `org_${organizationId}_whatsapp_${connection.id}`;

    const existingInstance = connection.metadata?.evolution?.instanceName;

    let evolution;

    if (!existingInstance) {
      await this.evolutionWhatsappProvider.createInstance({
        instanceName,
        webhookUrl: envConfig.evolution.webhookUrl,
      });
    }

    evolution = await this.evolutionWhatsappProvider.getQrCode(instanceName);

    const metadata = {
      ...(connection.metadata || {}),
      evolution: {
        ...(connection.metadata?.evolution || {}),
        instanceName,
      },
    };

    const updatedConnection = await this.whatsappConnectionRepository.update(
      connection.id,
      {
        metadata,
        status: "CONNECTING",
      },
    );

    return {
      connection: updatedConnection,
      evolution: {
        instanceName,
        pairingCode: evolution?.pairingCode || null,
        code: evolution?.code || null,
        base64: evolution?.base64 || null,
        count: evolution?.count || null,
      },
    };
  }
}
