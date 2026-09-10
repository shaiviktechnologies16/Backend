import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateWhatsappConnectionUseCase {
  constructor({
    whatsappConnectionRepository,
    projectRepository,
    agentRepository,
  }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.projectRepository = projectRepository;
    this.agentRepository = agentRepository;
  }

  async execute({
    organizationId,
    connectionId,
    data = {},
  }) {
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

    const updates = {};

    if (data.name !== undefined) {
      if (!data.name) {
        throw new AppError(
          "WhatsApp connection name is required.",
          400,
          "WHATSAPP_CONNECTION_NAME_REQUIRED",
        );
      }

      updates.name = data.name;
    }

    if (data.provider !== undefined) {
      if (!data.provider) {
        throw new AppError(
          "WhatsApp provider is required.",
          400,
          "WHATSAPP_PROVIDER_REQUIRED",
        );
      }

      updates.provider = data.provider;
    }

    if (data.phoneNumber !== undefined) {
      updates.phoneNumber = data.phoneNumber;
    }

    if (data.phoneNumberId !== undefined) {
      updates.phoneNumberId = data.phoneNumberId;
    }

    if (data.businessAccountId !== undefined) {
      updates.businessAccountId = data.businessAccountId;
    }

    if (data.status !== undefined) {
      updates.status = data.status;
    }

    if (data.qualityRating !== undefined) {
      updates.qualityRating = data.qualityRating;
    }

    if (data.credentials !== undefined) {
      updates.credentials = data.credentials;
    }

    if (data.metadata !== undefined) {
      updates.metadata = {
        ...(connection.metadata ?? {}),
        ...(data.metadata ?? {}),
      };
    }

    let projectId = data.projectId;

    if (projectId !== undefined && projectId !== null) {
      const project = await this.projectRepository.findById(projectId);

      if (!project) {
        throw new AppError(
          "Project not found.",
          404,
          "PROJECT_NOT_FOUND",
        );
      }

      if (project.organizationId !== organizationId) {
        throw new AppError(
          "Project does not belong to organization.",
          403,
          "INVALID_ORGANIZATION_PROJECT",
        );
      }

      updates.projectId = projectId;
    }

    if (data.agentId !== undefined && data.agentId !== null) {
      const agent = await this.agentRepository.findById(data.agentId);

      if (!agent) {
        throw new AppError(
          "Agent not found.",
          404,
          "AGENT_NOT_FOUND",
        );
      }

      const effectiveProjectId =
        projectId !== undefined
          ? projectId
          : connection.projectId;

      if (!effectiveProjectId) {
        throw new AppError(
          "Project ID is required when assigning an agent.",
          400,
          "PROJECT_ID_REQUIRED_FOR_AGENT",
        );
      }

      if (agent.projectId !== effectiveProjectId) {
        throw new AppError(
          "Agent does not belong to project.",
          403,
          "INVALID_PROJECT_AGENT",
        );
      }

      updates.agentId = data.agentId;
    }

    if (data.projectId === null) {
      updates.projectId = null;
      updates.agentId = null;
    }

    if (data.agentId === null) {
      updates.agentId = null;
    }

    if (Object.keys(updates).length === 0) {
      return connection;
    }

    return await this.whatsappConnectionRepository.update(
      connectionId,
      updates,
    );
  }
}
