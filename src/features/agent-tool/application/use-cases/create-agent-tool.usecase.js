import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";
import { AgentTool } from "../../domain/entities/agent-tool.entity.js";

export class CreateAgentToolUseCase {
  constructor({
    agentRepository,
    agentToolRepository,
    workspaceApiKeyRepository,
    projectRepository,
    checkProjectAccessUseCase,
  }) {
    this.agentRepository = agentRepository;
    this.agentToolRepository = agentToolRepository;
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
    this.projectRepository = projectRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({
    userId,
    agentId,
    name,
    description,
    type,
    configuration,
    credentialId = null,
  }) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: agent.projectId,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    const project = await this.projectRepository.findById(agent.projectId);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    if (credentialId) {
      const credential =
        await this.workspaceApiKeyRepository.findById(credentialId);

      if (!credential) {
        throw new AppError(
          "Workspace API key not found.",
          404,
          "API_KEY_NOT_FOUND",
        );
      }

      if (credential.organizationId !== project.organizationId) {
        throw new AppError(
          "Workspace API key does not belong to the agent organization.",
          403,
          "API_KEY_ORGANIZATION_MISMATCH",
        );
      }
    }

    const tools = await this.agentToolRepository.findByAgentId(agentId);

    const existing = tools.find((tool) => tool.name === name);

    if (existing) {
      throw new AppError(
        "Tool with this name already exists for the agent.",
        409,
        "AGENT_TOOL_ALREADY_EXISTS",
      );
    }

    const tool = new AgentTool({
      agentId,
      credentialId,
      name,
      description,
      type,
      configuration,
    });

    return await this.agentToolRepository.create(tool);
  }
}
