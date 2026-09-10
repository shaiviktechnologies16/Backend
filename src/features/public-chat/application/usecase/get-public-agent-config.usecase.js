import { AppError } from "../../../../common/errors/AppError.js";

export class GetPublicAgentConfigUseCase {
  constructor({ agentRepository, getPublicOrganizationUseCase }) {
    this.agentRepository = agentRepository;
    this.getPublicOrganizationUseCase = getPublicOrganizationUseCase;
  }

  async execute(publicKey) {
    const agent = await this.agentRepository.findByPublicKey(publicKey);

    if (!agent) {
      throw new AppError(
        "Agent not found, please contact administration.",
        404,
        "PUBLIC_AGENT_NOT_FOUND",
      );
    }

    const organization = await this.getPublicOrganizationUseCase.execute(
      agent.project.organizationId,
    );

    return {
      id: agent.id,
      projectId: agent.projectId,
      organizationId: agent.project.organizationId,
      name: agent.name,
      description: agent.description,
      companyName: organization.name,
      companyLogo: organization.logo ?? null,
      widgetConfig: agent.widgetConfig ?? {},
    };
  }

  async executeByAgentId(agentId) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError(
        "Agent not found, please contact administration.",
        404,
        "PUBLIC_AGENT_NOT_FOUND",
      );
    }

    const organization = await this.getPublicOrganizationUseCase.execute(
      agent.project.organizationId,
    );

    return {
      id: agent.id,
      projectId: agent.projectId,
      organizationId: agent.project.organizationId,
      name: agent.name,
      description: agent.description,
      companyName: organization.name,
      companyLogo: organization.logo ?? null,
      widgetConfig: agent.widgetConfig ?? {},
    };
  }
}
