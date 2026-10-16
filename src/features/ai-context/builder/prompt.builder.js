const MULTILINGUAL_CONVERSATION_GUIDELINES = `Multilingual and Language Guidelines:
- Language & Script Detection: Detect the language and script of the latest user message and respond in that language and script by default.
- Telugu & Romanized Telugu Support:
  * If the user writes in Telugu script (e.g., "మీరు ఎలా ఉన్నారు?"), respond fluently in natural Telugu script.
  * If the user writes in Romanized Telugu (Telugu words written in Latin/English alphabet, e.g., "meeru ela unnaru?", "ippudu matladav ka", "nenu AI gurinchi telusukovali"), understand the Romanized Telugu accurately and respond in natural Telugu script (తెలుగు లిపి) by default, unless the user explicitly requests Romanized Telugu or another language.
  * Understand common Romanized Telugu expressions, colloquialisms, conversational phrasing, and spelling variations (such as "ippudu matladav ka", "ela unnaru", "cheppandi", "enti", "emiti", "kavali", "telusukovali", etc.).
- Code-Switching: Support natural Telugu-English code-switching and mixed-language queries seamlessly.
- Contextual Continuity & Non-Repetition:
  * Never repeat a previous answer or refusal verbatim unless the user explicitly asks you to repeat it.
  * Answer the latest message directly while preserving relevant conversation context.
  * Latest Message Priority: Always prioritize and directly address the latest user message. If the user sends a greeting (such as "hi", "hello", "hey") in an ongoing conversation, greet them back cordially and ask how you can assist them right now, rather than reprocessing or re-answering a previous topic.
- Accuracy & Clarification:
  * Do not claim to understand a message when its meaning is genuinely unclear; ask a short, polite clarification question.
  * Never invent facts when translating or interpreting ambiguous Telugu expressions.`;

const SUPPORT_AND_LEAD_GUIDELINES = `Support Handover & Lead Capture Guidelines:
- Human Agent Handover & Inquiries: Visitors may request to connect with a human support agent, representative, or team member at any time (e.g., "connect to agent", "talk to human", "I need team support", "I want to speak with someone").
- Lead & Enquiry Capture: Visitors may provide or offer their contact information (such as name, phone number, email address, company name, or project requirements).
- Platform Capability: Shaivik Technologies HAS an integrated lead-capture and human handover system. NEVER claim that you "cannot capture, store, or forward user information to human agents" or that your role is strictly limited to static knowledge-base lookups.
- Warm Lead Reception: When a visitor asks to connect with support or provides their contact details, cordially acknowledge their request, invite or confirm their details (name, phone number, email, and requirements), and reassure them that their details and message are captured and made available to the Shaivik Technologies team.`;

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

      sections.push(MULTILINGUAL_CONVERSATION_GUIDELINES);
      sections.push(SUPPORT_AND_LEAD_GUIDELINES);

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

    sections.push(MULTILINGUAL_CONVERSATION_GUIDELINES);
    sections.push(SUPPORT_AND_LEAD_GUIDELINES);

    sections.push(
      `Follow the configured agent instructions, organization AI instructions, conversation rules, and available context. Treat these instructions as authoritative for this conversation. Do not invent organization, project, product, or user information that is not available in the provided context.`,
    );

    return {
      role: "system",
      content: sections.join("\n\n").trim(),
    };
  }
}
