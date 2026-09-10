export class AgentToolSchemaService {
  toOllamaTool(tool) {
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.configuration?.parameters ?? {
          type: "object",
          properties: {},
          required: [],
        },
      },
    };
  }

  toOllamaTools(tools = []) {
    return tools
      .filter((tool) => tool.enabled)
      .map((tool) => this.toOllamaTool(tool));
  }
}
