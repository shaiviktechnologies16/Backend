import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { AgentResponse } from "../../application/dto/responses/agent.response.js";

export class AgentController {
  constructor({
    createAgentUseCase,
    getAgentUseCase,
    getProjectAgentsUseCase,
    getOrganizationAgentsUseCase,
    updateAgentUseCase,
    deleteAgentUseCase,
    setDefaultAgentUseCase,
    enablePublicAgentUseCase,
    disablePublicAgentUseCase,
    regeneratePublicAgentKeyUseCase,
  }) {
    this.createAgentUseCase = createAgentUseCase;
    this.getAgentUseCase = getAgentUseCase;
    this.getProjectAgentsUseCase = getProjectAgentsUseCase;
    this.getOrganizationAgentsUseCase = getOrganizationAgentsUseCase;
    this.updateAgentUseCase = updateAgentUseCase;
    this.deleteAgentUseCase = deleteAgentUseCase;
    this.setDefaultAgentUseCase = setDefaultAgentUseCase;
    this.enablePublicAgentUseCase = enablePublicAgentUseCase;
    this.disablePublicAgentUseCase = disablePublicAgentUseCase;
    this.regeneratePublicAgentKeyUseCase = regeneratePublicAgentKeyUseCase;
  }

  createAgent = asyncHandler(async (req, res) => {
    const agent = await this.createAgentUseCase.execute({
      ...req.body,
      userId: req.context.user.id,
      organizationId: req.context.organization.id,
      projectId: req.context.project?.id,
    });

    res.status(201).json({
      success: true,
      message: "Agent created successfully.",
      data: new AgentResponse(agent),
    });
  });

  getAgentsByProject = asyncHandler(async (req, res) => {
    const agents = await this.getProjectAgentsUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
    });

    res.status(200).json({
      success: true,
      data: agents.map((agent) => new AgentResponse(agent)),
    });
  });

  getAgentById = asyncHandler(async (req, res) => {
    console.log("REQUEST AGENT ID:", req.params.id);
    console.log("REQUEST USER:", req.context.user.id);

    const agent = await this.getAgentUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: new AgentResponse(agent),
    });
  });

  getAgentsByOrganization = asyncHandler(async (req, res) => {
    const agents = await this.getOrganizationAgentsUseCase.execute({
      userId: req.context.user.id,
      organizationId: req.context.organization.id,
    });

    res.status(200).json({
      success: true,
      data: agents.map((agent) => new AgentResponse(agent)),
    });
  });

  updateAgent = asyncHandler(async (req, res) => {
    const agent = await this.updateAgentUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "Agent updated successfully.",
      data: new AgentResponse(agent),
    });
  });

  deleteAgent = asyncHandler(async (req, res) => {
    const result = await this.deleteAgentUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Agent deleted successfully.",
      data: result,
    });
  });

  setDefaultAgent = asyncHandler(async (req, res) => {
    const agent = await this.setDefaultAgentUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Default agent updated successfully.",
      data: new AgentResponse(agent),
    });
  });

  enablePublic = asyncHandler(async (req, res) => {
    const agent = await this.enablePublicAgentUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
    });
    res.status(200).json({
      success: true,
      message: "Agent enabled for public chat successfully.",
      data: {
        id: agent.id,
        visibility: agent.visibility,
        publicKey: agent.publicKey,
        publicEnabledAt: agent.publicEnabledAt,
      },
    });
  });

  disablePublic = asyncHandler(async (req, res) => {
    const agent = await this.disablePublicAgentUseCase.execute(req.params.id);

    res.status(200).json({
      success: true,
      message: "Agent disabled for public chat successfully.",
      data: {
        id: agent.id,
        visibility: agent.visibility,
        publicKey: agent.publicKey,
        publicEnabledAt: agent.publicEnabledAt,
      },
    });
  });
  regeneratePublicKey = asyncHandler(async (req, res) => {
    const agent = await this.regeneratePublicAgentKeyUseCase.execute({
      userId: req.context.user.id,
      agentId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Public key regenerated successfully.",
      data: {
        id: agent.id,
        visibility: agent.visibility,
        publicKey: agent.publicKey,
        publicEnabledAt: agent.publicEnabledAt,
      },
    });
  });
}
