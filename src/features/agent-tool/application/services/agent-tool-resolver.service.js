import { AppError } from "../../../../common/errors/AppError.js";

export const BUILTIN_TOOLS = {
  fetch_website: {
    id: "system_tool_fetch_website",
    name: "fetch_website",
    type: "SYSTEM",
    enabled: true,
    description:
      "Retrieve readable content and page title from a publicly accessible HTTP or HTTPS website URL.",
    configuration: {},
  },
};

export class AgentToolResolverService {
  constructor(agentToolRepository) {
    this.agentToolRepository = agentToolRepository;
  }

  async resolve(agentId, toolName) {
    if (BUILTIN_TOOLS[toolName]) {
      return BUILTIN_TOOLS[toolName];
    }

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
