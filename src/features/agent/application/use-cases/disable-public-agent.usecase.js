import { AppError } from "../../../../common/errors/AppError.js";

export class DisablePublicAgentUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(agentId) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    if (agent.visibility === "PRIVATE" && !agent.publicKey) {
      return agent;
    }

    agent.disablePublic();

    return this.agentRepository.update(agent);
  }
}
