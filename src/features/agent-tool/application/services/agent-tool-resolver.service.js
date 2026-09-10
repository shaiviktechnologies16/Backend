import { AppError } from "../../../../common/errors/AppError.js";

export class AgentToolResolverService {
  constructor(agentToolRepository) {
    this.agentToolRepository = agentToolRepository;
  }

  async resolve(agentId, toolName) {
    const tools = await this.agentToolRepository.findByAgentId(agentId);

    const tool = tools.find((item) => item.name === toolName && item.enabled);

    if (!tool) {
      throw new AppError(
        `Agent tool "${toolName}" was not found or is disabled.`,
        404,
        "AGENT_TOOL_NOT_FOUND",
      );
    }

    return tool;
  }
}
