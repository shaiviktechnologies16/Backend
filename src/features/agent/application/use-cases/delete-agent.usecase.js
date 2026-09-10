import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class DeleteAgentUseCase {
  constructor({ agentRepository, checkProjectAccessUseCase }) {
    this.agentRepository = agentRepository;
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
      allowedRoles: [ProjectMemberRole.ADMIN],
    });

    if (agent.isDefault) {
      throw new AppError(
        "Default agent cannot be deleted.",
        400,
        "DEFAULT_AGENT_DELETE_NOT_ALLOWED",
      );
    }

    await this.agentRepository.delete(agentId);

    return {
      id: agentId,
    };
  }
}
