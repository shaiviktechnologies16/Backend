import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformWhatsappConnection } from "../../domain/entities/platform-whatsapp-connection.entity.js";
import envConfig from "../../../../config/env.config.js";

export class CreatePlatformWhatsappConnectionUseCase {
  constructor({
    platformWhatsappConnectionRepository,
    platformEvolutionWhatsappProvider,
  }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;

    this.platformEvolutionWhatsappProvider = platformEvolutionWhatsappProvider;
  }

  async execute({
    name,
    provider = "EVOLUTION",
    phoneNumber = null,
    credentials = null,
    metadata = {},
  }) {
    if (!name) {
      throw new AppError(
        "Platform WhatsApp connection name is required.",
        400,
        "PLATFORM_WHATSAPP_CONNECTION_NAME_REQUIRED",
      );
    }

    if (!provider) {
      throw new AppError(
        "WhatsApp provider is required.",
        400,
        "WHATSAPP_PROVIDER_REQUIRED",
      );
    }

    if (provider !== "EVOLUTION") {
      throw new AppError(
        "Unsupported WhatsApp provider.",
        400,
        "UNSUPPORTED_WHATSAPP_PROVIDER",
      );
    }

    const instanceName = `platform-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    const existing =
      await this.platformWhatsappConnectionRepository.findByEvolutionInstanceName(
        instanceName,
      );

    if (existing) {
      throw new AppError(
        "A Platform WhatsApp connection with this instance already exists.",
        409,
        "PLATFORM_WHATSAPP_CONNECTION_ALREADY_EXISTS",
      );
    }

    const evolution =
      await this.platformEvolutionWhatsappProvider.createInstance({
        instanceName,
        webhookUrl: envConfig.evolution.webhookUrl,
      });

    const connection = new PlatformWhatsappConnection({
      name,
      provider,
      phoneNumber,
      status: "PENDING",
      credentials,
      metadata: {
        ...metadata,
        evolution: {
          instanceName,
        },
      },
    });

    const createdConnection =
      await this.platformWhatsappConnectionRepository.create(connection);

    return {
      connection: createdConnection,
      evolution,
    };
  }
}
