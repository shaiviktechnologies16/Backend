export const FETCH_WEBSITE_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "fetch_website",
    description:
      "Retrieve readable content and page title from a publicly accessible HTTP or HTTPS website URL so the assistant can answer questions about its contents.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The publicly accessible HTTP or HTTPS website URL to retrieve.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
};

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

  toOllamaTools(tools = [], options = {}) {
    const { includeBuiltins = true } = options;
    const formatted = Array.isArray(tools)
      ? tools
          .filter((tool) => tool.enabled)
          .map((tool) => this.toOllamaTool(tool))
      : [];

    if (includeBuiltins) {
      const hasFetchWebsite = formatted.some(
        (t) => t.function?.name === "fetch_website",
      );
      if (!hasFetchWebsite) {
        formatted.push(FETCH_WEBSITE_TOOL_DEFINITION);
      }
    }

    return formatted;
  }
}
