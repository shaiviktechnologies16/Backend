import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class DeleteAgentToolUseCase {
  constructor({
    agentToolRepository,
    agentRepository,
    checkProjectAccessUseCase,
  }) {
    this.agentToolRepository = agentToolRepository;
    this.agentRepository = agentRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({
    userId,
    toolId,
  }) {
    const tool = await this.agentToolRepository.findById(toolId);

    if (!tool) {
      throw new AppError(
        "Agent tool not found.",
        404,
        "AGENT_TOOL_NOT_FOUND",
      );
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

    await this.agentToolRepository.delete(toolId);
  }
}
