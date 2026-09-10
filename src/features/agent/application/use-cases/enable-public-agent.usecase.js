import { AppError } from "../../../../common/errors/AppError.js";
import { generatePublicKey } from "../../../../common/utils/public-key.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class EnablePublicAgentUseCase {
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
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    if (agent.visibility === "PUBLIC" && agent.publicKey) {
      return agent;
    }

    agent.enablePublic(generatePublicKey());

    return this.agentRepository.update(agent);
  }
}
