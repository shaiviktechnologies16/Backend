import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class GetAgentToolsUseCase {
  constructor({
    agentRepository,
    agentToolRepository,
    checkProjectAccessUseCase,
  }) {
    this.agentRepository = agentRepository;
    this.agentToolRepository = agentToolRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, agentId }) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: agent.projectId,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    return await this.agentToolRepository.findByAgentId(agentId);
  }
}
