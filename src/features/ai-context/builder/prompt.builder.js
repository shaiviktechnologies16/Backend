export class PromptBuilder {
  build(context, options = {}) {
    const {
      lightweight = false,
      includeUserContext = true,
      includeOrganizationContext = true,
      includeProjectContext = true,
      includeConversationContext = true,
    } = options;

    if (lightweight) {
      const sections = [`You are ${context.agent?.name ?? "AI Assistant"}.`];

      if (context.agent?.systemPrompt?.trim()) {
        sections.push(
          `Agent Instructions:\n${context.agent.systemPrompt.trim()}`,
        );
      }

      if (context.aiSettings?.tone?.trim()) {
        sections.push(`Tone: ${context.aiSettings.tone.trim()}`);
      }

      if (context.aiSettings?.responseStyle?.trim()) {
        sections.push(
          `Response Style: ${context.aiSettings.responseStyle.trim()}`,
        );
      }

      return {
        role: "system",
        content: sections.join("\n\n").trim(),
      };
    }

    const sections = [
      `You are ${context.agent?.name ?? "AI Assistant"}`,

      `Agent Instructions:

${context.agent?.systemPrompt ?? ""}`,

      `Organization AI Instructions:

${context.aiSettings?.defaultInstructions ?? ""}`,

      `Conversation Rules:

${context.aiSettings?.conversationRules ?? ""}`,

      `Tone: ${context.aiSettings?.tone ?? "professional"}`,

      `Response Style: ${context.aiSettings?.responseStyle ?? "balanced"}`,
    ];

    if (includeUserContext) {
      sections.push(`Current User:

Name: ${context.user?.name ?? "Unknown"}

User ID: ${context.user?.id ?? "Unknown"}`);
    }

    if (includeOrganizationContext) {
      sections.push(`Organization:

${context.organization?.name ?? "Unknown"}`);
    }

    if (includeProjectContext) {
      sections.push(`Project:

${context.project?.name ?? "Unknown"}

Role:

${context.projectMember?.role ?? "Unknown"}`);
    }

    if (includeConversationContext) {
      sections.push(`Conversation:

ID: ${context.conversation?.id ?? "Unknown"}

Title: ${context.conversation?.title ?? "New Conversation"}`);
    }

    sections.push(
      `Response Style Guidelines: Provide direct, accurate, and concise answers. Avoid repeating the user's question, conversational filler, or unnecessary concluding sentences unless explicitly asked.`,
    );

    sections.push(
      `Follow the configured agent instructions, organization AI instructions, conversation rules, and available context. Treat these instructions as authoritative for this conversation. Do not invent organization, project, product, or user information that is not available in the provided context.`,
    );

    return {
      role: "system",
      content: sections.join("\n\n").trim(),
    };
  }
}
