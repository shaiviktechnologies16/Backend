import { AppError } from "../../../../common/errors/AppError.js";
import envConfig from "../../../../config/env.config.js";
import { WhatsappConnection } from "../../domain/entities/whatsapp-connection.entity.js";

export class CreateWhatsappConnectionUseCase {
  constructor({
    whatsappConnectionRepository,
    projectRepository,
    agentRepository,
    evolutionWhatsappProvider,
  }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.projectRepository = projectRepository;
    this.agentRepository = agentRepository;
    this.evolutionWhatsappProvider = evolutionWhatsappProvider;
  }

  async execute({
    organizationId,
    name,
    provider,
    phoneNumber = null,
    phoneNumberId = null,
    businessAccountId = null,
    status = "PENDING",
    qualityRating = null,
    projectId = null,
    agentId = null,
    credentials = null,
    metadata = {},
  }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!name) {
      throw new AppError(
        "WhatsApp connection name is required.",
        400,
        "WHATSAPP_CONNECTION_NAME_REQUIRED",
      );
    }

    if (!provider) {
      throw new AppError(
        "WhatsApp provider is required.",
        400,
        "WHATSAPP_PROVIDER_REQUIRED",
      );
    }

    let project = null;

    if (projectId) {
      project = await this.projectRepository.findById(projectId);

      if (!project) {
        throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
      }

      if (project.organizationId !== organizationId) {
        throw new AppError(
          "Project does not belong to organization.",
          403,
          "INVALID_ORGANIZATION_PROJECT",
        );
      }
    }

    if (agentId) {
      const agent = await this.agentRepository.findById(agentId);

      if (!agent) {
        throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
      }

      if (projectId && agent.projectId !== projectId) {
        throw new AppError(
          "Agent does not belong to project.",
          403,
          "INVALID_PROJECT_AGENT",
        );
      }

      if (!projectId) {
        project = await this.projectRepository.findById(agent.projectId);

        if (!project) {
          throw new AppError(
            "Agent project not found.",
            404,
            "AGENT_PROJECT_NOT_FOUND",
          );
        }

        if (project.organizationId !== organizationId) {
          throw new AppError(
            "Agent does not belong to organization.",
            403,
            "INVALID_ORGANIZATION_AGENT",
          );
        }
      }
    }

    let evolutionInstanceName = null;
    let evolutionInstance = null;

    if (provider === "EVOLUTION") {
      if (!this.evolutionWhatsappProvider) {
        throw new AppError(
          "Evolution WhatsApp provider is not configured.",
          500,
          "EVOLUTION_PROVIDER_NOT_CONFIGURED",
        );
      }

      evolutionInstanceName = `${name}-${organizationId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      evolutionInstance = await this.evolutionWhatsappProvider.createInstance({
        instanceName: evolutionInstanceName,
        webhookUrl: envConfig.evolution.webhookUrl,
      });

      metadata = {
        ...metadata,
        evolution: {
          instanceName: evolutionInstanceName,
        },
      };
    }

    const connection = new WhatsappConnection({
      organizationId,
      name,
      provider,
      phoneNumber,
      phoneNumberId,
      businessAccountId,
      status,
      qualityRating,
      projectId,
      agentId,
      credentials,
      metadata,
    });

    const createdConnection =
      await this.whatsappConnectionRepository.create(connection);

    return {
      connection: createdConnection,
      providerData: evolutionInstance,
    };
  }
}
