import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class UpdateAgentToolUseCase {
  constructor({
    agentToolRepository,
    agentRepository,
    workspaceApiKeyRepository,
    projectRepository,
    checkProjectAccessUseCase,
  }) {
    this.agentToolRepository = agentToolRepository;
    this.agentRepository = agentRepository;
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
    this.projectRepository = projectRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, toolId, data }) {
    const tool = await this.agentToolRepository.findById(toolId);

    if (!tool) {
      throw new AppError("Agent tool not found.", 404, "AGENT_TOOL_NOT_FOUND");
    }

    const agent = await this.agentRepository.findById(tool.agentId);

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

    if (data.credentialId !== undefined && data.credentialId !== null) {
      const credential = await this.workspaceApiKeyRepository.findById(
        data.credentialId,
      );

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

    tool.update(data);

    return await this.agentToolRepository.update(tool);
  }
}
