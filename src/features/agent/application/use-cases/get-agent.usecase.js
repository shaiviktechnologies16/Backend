import { AppError } from "../../../../common/errors/AppError.js";

export class GetAgentUseCase {
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
    });

    return agent;
  }
}
