import { Conversation } from "../entity/conversation.entity.js";
import { Message } from "../../message/entity/message.entity.js";
import { Usage } from "../../usage/entity/usage.entity.js";
import { MessageRole } from "../../../common/constants/message-role.js";
import { executeTransaction } from "../../../database/transaction.js";
import { AppError } from "../../../common/errors/AppError.js";
import {
  isSimpleConversationalMessage,
  isHumanHandoverIntent,
  isReturnToAiIntent,
} from "../service/message-intent.service.js";
import {
  sanitizeUserPromptInput,
  appendSecurityGuardrailsToSystemPrompt,
} from "../../../common/utils/prompt-guard.util.js";
import { workspaceRealtimeEmitter } from "../../../common/utils/workspace-event-emitter.js";

export class ConversationService {
  constructor({
    conversationRepository,
    messageRepository,
    usageRepository,
    agentRepository,
    aiProviderFactory,
    aiContextService,
    checkProjectAccessUseCase,
    checkPlanUsageUseCase,
    knowledgeSearchService,
    agentToolRepository,
    agentToolSchemaService,
    agentToolExecutorService,
    agentToolResolverService,
    getPlatformConfigUseCase,
    organizationModelAccessRepository = null,
    organizationModelEntitlementService = null,
    modelCostCalculatorService = null,
    budgetCapGuardService = null,
    webhookDispatcherService = null,
    whatsappConnectionRepository = null,
    whatsappProvider = null,
    companyProfileRepository = null,
    sendHandoverNotificationToWhatsappUseCase = null,
    captureLeadUseCase = null,
    leadRepository = null,
  }) {
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.usageRepository = usageRepository;
    this.agentRepository = agentRepository;
    this.aiProviderFactory = aiProviderFactory;
    this.aiContextService = aiContextService;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
    this.checkPlanUsageUseCase = checkPlanUsageUseCase;
    this.knowledgeSearchService = knowledgeSearchService;
    this.agentToolRepository = agentToolRepository;
    this.agentToolSchemaService = agentToolSchemaService;
    this.agentToolExecutorService = agentToolExecutorService;
    this.agentToolResolverService = agentToolResolverService;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.organizationModelAccessRepository = organizationModelAccessRepository;
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
    this.modelCostCalculatorService = modelCostCalculatorService;
    this.budgetCapGuardService = budgetCapGuardService;
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.whatsappProvider = whatsappProvider;
    this.companyProfileRepository = companyProfileRepository;
    this.sendHandoverNotificationToWhatsappUseCase =
      sendHandoverNotificationToWhatsappUseCase;
    this.captureLeadUseCase = captureLeadUseCase;
    this.leadRepository = leadRepository;
    this.agentTypingRegistry = new Map();
  }

  calculateDynamicMaxTokens({
    agentMaxTokens,
    isSimpleMessage,
    hasRagSources,
  }) {
    if (
      agentMaxTokens &&
      typeof agentMaxTokens === "number" &&
      agentMaxTokens > 0
    ) {
      return Math.max(agentMaxTokens, isSimpleMessage ? 384 : 768);
    }

    if (isSimpleMessage) {
      return 384;
    }

    if (hasRagSources) {
      return 768;
    }

    return 512;
  }


  isSameCalendarDay(date1, date2, timeZone = "Asia/Kolkata") {
    if (!date1 || !date2) return false;

    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);

      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      return formatter.format(d1) === formatter.format(d2);
    } catch {
      const d1 = new Date(date1);
      const d2 = new Date(date2);

      return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
      );
    }
  }

  setAgentTyping({ conversationId, isTyping }) {
    if (!conversationId) return;
    if (Boolean(isTyping)) {
      this.agentTypingRegistry.set(conversationId, {
        isTyping: true,
        lastTypedAt: Date.now(),
      });
    } else {
      this.agentTypingRegistry.delete(conversationId);
    }
  }

  isAgentTyping(conversationId) {
    if (!conversationId) return false;
    const entry = this.agentTypingRegistry.get(conversationId);
    if (!entry || !entry.isTyping) return false;
    if (Date.now() - entry.lastTypedAt > 4000) {
      this.agentTypingRegistry.delete(conversationId);
      return false;
    }
    return true;
  }

  touchConversation(conversation) {
    if (!conversation) return;
    if (typeof conversation.touch === "function") {
      conversation.touch();
    } else {
      conversation.updatedAt = new Date();
    }
  }

  async safeUpdateConversation(conversation, manager = null) {
    if (!conversation) return conversation;
    this.touchConversation(conversation);
    if (typeof this.conversationRepository?.update === "function") {
      return await this.conversationRepository.update(conversation, manager);
    }
    return conversation;
  }

  async getCompanyTimezone(organizationId) {
    if (!organizationId || !this.companyProfileRepository) {
      return "Asia/Kolkata";
    }

    if (!this.timezoneCache) {
      this.timezoneCache = new Map();
    }

    const cached = this.timezoneCache.get(organizationId);
    if (cached && Date.now() - cached.timestamp < 300_000) {
      return cached.timezone;
    }

    let timeZone = "Asia/Kolkata";
    try {
      const companyProfile =
        await this.companyProfileRepository.findByOrganizationId(
          organizationId,
        );
      if (companyProfile?.timezone) {
        timeZone = companyProfile.timezone;
      }
    } catch {
      // Fallback
    }

    this.timezoneCache.set(organizationId, {
      timezone: timeZone,
      timestamp: Date.now(),
    });

    return timeZone;
  }

  async sendAgentReply({ userId, conversationId, content }) {
    if (!content || !content.trim()) {
      throw new AppError(
        "Message content is required.",
        400,
        "MESSAGE_REQUIRED",
      );
    }

    const conversation = await this.getConversation(userId, conversationId);

    this.setAgentTyping({ conversationId, isTyping: false });

    await this.safeUpdateConversation(conversation);

    const agentMessage = new Message({
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: content.trim(),
    });

    const createdMessage = await this.messageRepository.create(agentMessage);

    workspaceRealtimeEmitter.emit("conversation.message.created", {
      conversationId: conversation.id,
      projectId: conversation.projectId,
      message: {
        id: createdMessage.id,
        role: createdMessage.role,
        content: createdMessage.content,
        createdAt: createdMessage.createdAt || new Date().toISOString(),
      },
      updatedAt: conversation.updatedAt
        ? conversation.updatedAt.toISOString()
        : new Date().toISOString(),
    });

    if (
      conversation.visitorId &&
      conversation.visitorId.startsWith("wa_") &&
      this.whatsappConnectionRepository &&
      this.whatsappProvider
    ) {
      try {
        const rawPhone = conversation.visitorId.replace("wa_", "");
        const phoneNumber = `+${rawPhone}`;
        const connections =
          await this.whatsappConnectionRepository.findByProjectId(
            conversation.projectId,
          );
        const activeConn =
          connections.find((c) => c.status === "CONNECTED") || connections[0];

        if (activeConn) {
          await this.whatsappProvider.sendMessage(
            activeConn,
            phoneNumber,
            content.trim(),
          );
        }
      } catch (err) {
        console.error("[AGENT REPLY WHATSAPP OUTBOUND ERROR]:", err.message);
      }
    }

    return createdMessage;
  }

  async toggleHandoverMode({ conversationId, isHandover, lastMessage = null }) {
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new AppError(
        "Conversation not found.",
        404,
        "CONVERSATION_NOT_FOUND",
      );
    }

    const wasHandover = conversation.isHandover;
    conversation.setHandoverMode(Boolean(isHandover));
    const updated = await this.conversationRepository.update(conversation);

    let notificationSent = false;
    let notificationError = null;

    if (Boolean(isHandover) && !wasHandover) {
      try {
        const agent = await this.agentRepository.findById(conversation.agentId);
        const orgId = agent?.project?.organizationId;

        if (orgId && this.webhookDispatcherService) {
          try {
            await this.webhookDispatcherService.dispatch(
              orgId,
              "handover.requested",
              {
                conversationId: conversation.id,
                agentId: conversation.agentId,
                projectId: conversation.projectId,
                organizationId: orgId,
                visitorId: conversation.visitorId,
                requestedAt: conversation.handoverRequestedAt,
              },
            );
          } catch (err) {
            console.error("[HANDOVER WEBHOOK DISPATCH ERROR]:", err.message);
          }
        }

        if (orgId && this.sendHandoverNotificationToWhatsappUseCase) {
          try {
            let userMsg = lastMessage;
            if (!userMsg && this.messageRepository) {
              const recent =
                await this.messageRepository.findRecentByConversationId(
                  conversation.id,
                  5,
                );
              const lastUser = recent
                .slice()
                .reverse()
                .find((m) => m.role === "user");
              userMsg = lastUser?.content;
            }

            let leadInfo = null;
            if (this.leadRepository) {
              try {
                leadInfo =
                  await this.leadRepository.findExistingForConversation(
                    conversation.id,
                    conversation.visitorId,
                  );
              } catch (leadErr) {
                console.warn(
                  "[HANDOVER_LEAD_LOOKUP_WARNING]:",
                  leadErr.message,
                );
              }
            }

            const notificationResult =
              await this.sendHandoverNotificationToWhatsappUseCase.execute({
                organizationId: orgId,
                conversationId: conversation.id,
                projectId: conversation.projectId,
                agentName: agent?.name,
                projectName: agent?.project?.name,
                visitorId: conversation.visitorId,
                lastMessage: userMsg || "Handover requested by visitor",
                lead: leadInfo,
              });

            notificationSent = true;
            console.log(
              "[HANDOVER_WHATSAPP_NOTIFICATION_SENT]",
              notificationResult,
            );
          } catch (err) {
            notificationSent = false;
            notificationError = err.message;
            console.error(
              "[HANDOVER_WHATSAPP_NOTIFICATION_FAILED]:",
              err.message,
            );
          }
        }
      } catch (err) {
        notificationError = err.message;
        console.error("[HANDOVER NOTIFICATION ERROR]:", err.message);
      }
    }

    if (updated) {
      updated.notificationSent = notificationSent;
      updated.notificationError = notificationError;
    }

    return updated;
  }

  extractLeadDetails(content) {
    if (!content || typeof content !== "string") return null;

    const text = content.trim();

    // 1. Phone number (Indian/international 10-12 digits)
    const phoneMatch = text.match(
      /(?:(?:\+|00)91[\s.-]*)?[6789]\d{9}\b|\b\d{10}\b/,
    );
    const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : null;

    // 2. Email address
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    const email = emailMatch ? emailMatch[0] : null;

    // 3. Name (explicit indicator, e.g. "my name is John", "name: John", "i am John")
    let name = null;
    const nameMatch = text.match(
      /(?:my name is|i am|this is|name\s*[:\-])\s+([A-Za-z][A-Za-z\s]{1,30})/i,
    );
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    // 4. Company (explicit indicator, e.g. "company: Acme", "firm: Acme")
    let company = null;
    const companyMatch = text.match(
      /(?:company\s*[:\-]|firm\s*[:\-]|from\s+organization\s*[:\-])\s+([A-Za-z0-9][A-Za-z0-9\s.,&-]{1,40})/i,
    );
    if (companyMatch) {
      company = companyMatch[1].trim();
    }

    if (!phone && !email) {
      return null;
    }

    return {
      name,
      phone,
      email,
      company,
      requirement: text,
    };
  }

  async recordVisitorLeadIfPresent({ conversation, content, agent }) {
    if (!this.captureLeadUseCase || !content || !conversation) return null;

    const leadData = this.extractLeadDetails(content);
    if (!leadData) return null;

    try {
      const result = await this.captureLeadUseCase.execute({
        agentId: conversation.agentId,
        conversationId: conversation.id,
        visitorId: conversation.visitorId,
        name: leadData.name || null,
        phone: leadData.phone || null,
        email: leadData.email || null,
        requirement: leadData.requirement || content,
        source: "AI_AGENT",
        status: "NEW",
        metadata: leadData.company ? { company: leadData.company } : {},
      });

      console.log("[LEAD_CAPTURED_FROM_CONVERSATION]", {
        conversationId: conversation.id,
        leadId: result?.lead?.id,
        whatsappSent: Boolean(result?.whatsapp?.sent),
      });

      return result?.lead || null;
    } catch (err) {
      console.error("[LEAD_CAPTURE_FROM_CONVERSATION_FAILED]:", err.message);
      return null;
    }
  }

  async completeConversation({ userId = null, conversationId }) {
    if (!conversationId) {
      throw new AppError(
        "Conversation ID is required.",
        400,
        "CONVERSATION_ID_REQUIRED",
      );
    }

    let updatedConversation;
    let closingMessage;

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      const conversation = await this.conversationRepository.findById(
        conversationId,
        manager,
      );

      if (!conversation) {
        throw new AppError(
          "Conversation not found.",
          404,
          "CONVERSATION_NOT_FOUND",
        );
      }

      if (conversation.isCompleted) {
        updatedConversation = conversation;
        return;
      }

      conversation.completeConversation(userId);
      updatedConversation = await this.conversationRepository.update(
        conversation,
        manager,
      );

      const closingText =
        "Thank you for contacting our support team. We're glad we could assist you. If you need anything else, feel free to start a new conversation anytime.";

      closingMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: closingText,
      });

      await this.messageRepository.create(closingMessage, manager);
    });

    if (closingMessage && updatedConversation) {
      workspaceRealtimeEmitter.emit("conversation.message.created", {
        conversationId: updatedConversation.id,
        projectId: updatedConversation.projectId,
        message: {
          id: closingMessage.id,
          role: closingMessage.role,
          content: closingMessage.content,
          createdAt: closingMessage.createdAt || new Date().toISOString(),
        },
      });

      workspaceRealtimeEmitter.emit("conversation.status.updated", {
        conversationId: updatedConversation.id,
        projectId: updatedConversation.projectId,
        isHandover: false,
        isCompleted: true,
        status: "COMPLETED",
        updatedAt: updatedConversation.updatedAt || new Date().toISOString(),
      });
    }

    return updatedConversation;
  }

  async validateAgentModelAccess(agent) {
    const orgId = agent?.project?.organizationId;
    if (!orgId) {
      throw new AppError(
        "Agent organization could not be determined.",
        500,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    if (!this.modelAccessCache) {
      this.modelAccessCache = new Map();
    }
    const cacheKey = `${orgId}:${agent?.aiModelId || agent?.model || "no-model"}`;
    const cached = this.modelAccessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30_000) {
      return;
    }

    if (this.budgetCapGuardService) {
      await this.budgetCapGuardService.checkBudgetCap(orgId);
    }

    if (this.organizationModelAccessRepository) {
      let access = null;
      if (agent?.aiModelId) {
        access = await this.organizationModelAccessRepository.findOne(
          orgId,
          agent.aiModelId,
        );
      }

      // If access not matched by ID (e.g. legacy model ID or direct model name), try matching canonical provider and model
      if (!access && (agent?.provider || agent?.model)) {
        const assigned =
          await this.organizationModelAccessRepository.findByOrganizationId(
            orgId,
          );
        access = assigned.find(
          (item) =>
            item.aiModel &&
            item.aiModel.status === "ACTIVE" &&
            item.aiModel.provider?.toLowerCase() ===
              agent.provider?.toLowerCase() &&
            item.aiModel.model?.toLowerCase() === agent.model?.toLowerCase(),
        );
      }

      if (!access || access.aiModel?.status !== "ACTIVE") {
        throw new AppError(
          `The configured AI model (${agent?.provider || "unknown"} / ${agent?.model || "unknown"}) is not assigned to your organization. Please update the agent settings to select an authorized model.`,
          403,
          "MODEL_ACCESS_DENIED",
        );
      }
    }

    this.modelAccessCache.set(cacheKey, { timestamp: Date.now() });
  }

  invalidateModelAccessCache(organizationId) {
    if (!this.modelAccessCache) return;
    if (organizationId) {
      for (const key of this.modelAccessCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.modelAccessCache.delete(key);
        }
      }
    } else {
      this.modelAccessCache.clear();
    }
  }

  async getAgent(userId, agentId = null, projectId = null) {
    let agent;

    if (agentId) {
      agent = await this.agentRepository.findById(agentId);

      if (!agent) {
        throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
      }

      if (projectId && agent.projectId !== projectId) {
        throw new AppError(
          "Agent does not belong to project.",
          403,
          "INVALID_PROJECT_ACCESS",
        );
      }

      await this.checkProjectAccessUseCase.execute({
        projectId: agent.projectId,
        userId,
      });
    } else {
      if (!projectId) {
        throw new AppError("Project ID is required.", 400, "PROJECT_REQUIRED");
      }

      agent = await this.agentRepository.findDefaultByProject(projectId);

      if (!agent) {
        throw new AppError(
          "Default agent not found.",
          404,
          "DEFAULT_AGENT_NOT_FOUND",
        );
      }

      await this.checkProjectAccessUseCase.execute({
        projectId,
        userId,
      });
    }

    return agent;
  }

  async getConversation(userId, conversationId, manager = null) {
    const conversation = await this.conversationRepository.findById(
      conversationId,
      manager,
    );

    if (!conversation) {
      throw new AppError(
        "Conversation not found.",
        404,
        "CONVERSATION_NOT_FOUND",
      );
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: conversation.projectId,
      userId,
    });

    return conversation;
  }

  async createConversation(
    userId,
    { title = "New Conversation", agentId = null, projectId = null } = {},
  ) {
    const agent = await this.getAgent(userId, agentId, projectId);

    const conversation = new Conversation({
      userId,
      projectId: agent.projectId,
      agentId: agent.id,
      title,
    });

    return await this.conversationRepository.create(conversation);
  }

  async getConversationById(userId, conversationId) {
    return await this.getConversation(userId, conversationId);
  }

  async getConversations(userId, projectId) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    return await this.conversationRepository.findAllByProject(projectId);
  }

  async buildRagSystemMessage({
    context,
    projectId,
    query,
    isPublic = false,
    preloadedKnowledgeResults = null,
  }) {
    const systemMessage = this.aiContextService.buildSystemMessage(context);

    if (!projectId) {
      return {
        message: systemMessage,
        systemMessages: [systemMessage],
        sources: [],
      };
    }

    let knowledgeResults = preloadedKnowledgeResults;
    if (!knowledgeResults) {
      try {
        knowledgeResults = await this.knowledgeSearchService.search({
          projectId,
          query,
        });
      } catch (ragErr) {
        console.warn(
          "[RAG_SEARCH_FALLBACK] Knowledge search failed, continuing with agent prompt instructions:",
          ragErr.message,
        );
        knowledgeResults = [];
      }
    }

    const [ragSystemPrompt, noContextMessage] = await Promise.all([
      this.getPlatformConfigUseCase.getValue("AI_RAG_SYSTEM_PROMPT"),
      this.getPlatformConfigUseCase.getValue("AI_RAG_NO_CONTEXT_MESSAGE"),
    ]);

    const knowledgeContext = knowledgeResults
      .map((result, index) => {
        return `[Knowledge ${index + 1}]\n${result.content}`;
      })
      .join("\n\n");

    const guardedSystemPromptContent = appendSecurityGuardrailsToSystemPrompt(
      systemMessage.content,
    );

    const knowledgeMessageContent = `${ragSystemPrompt}\n\nKnowledge Context:\n${knowledgeContext || noContextMessage}`;

    return {
      message: {
        role: MessageRole.SYSTEM,
        content: `${guardedSystemPromptContent}\n\n${knowledgeMessageContent}`,
      },
      systemMessages: [
        {
          role: MessageRole.SYSTEM,
          content: guardedSystemPromptContent,
        },
        {
          role: MessageRole.SYSTEM,
          content: knowledgeMessageContent,
        },
      ],
      sources: knowledgeResults.map((result) => ({
        knowledgeSourceId: result.knowledgeSourceId,
        knowledgeSourceName: result.knowledgeSourceName,
        chunkId: result.id,
        chunkIndex: result.chunkIndex,
        similarity: result.similarity,
      })),
    };
  }
  async getAgentTools(agentId) {
    const tools = await this.agentToolRepository.findByAgentId(agentId);

    return {
      tools,
      schemas: this.agentToolSchemaService.toOllamaTools(tools),
    };
  }

  async sendMessage(
    userId,
    conversationId,
    content,
    agentId = null,
    projectId = null,
  ) {
    let conversation;
    let agent;

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      if (conversationId) {
        conversation = await this.getConversation(
          userId,
          conversationId,
          manager,
        );

        agent = await this.agentRepository.findById(conversation.agentId);

        if (!agent) {
          throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
        }
      } else {
        agent = await this.getAgent(userId, agentId, projectId);

        conversation = new Conversation({
          userId,
          projectId: agent.projectId,
          agentId: agent.id,
          title: "New Conversation",
        });

        conversation = await this.conversationRepository.create(
          conversation,
          manager,
        );
      }

      if (!agent.project?.organizationId) {
        throw new AppError(
          "Agent organization could not be determined.",
          500,
          "ORGANIZATION_NOT_FOUND",
        );
      }

      await this.validateAgentModelAccess(agent);

      await this.checkPlanUsageUseCase.execute({
        organizationId: agent.project.organizationId,
      });

      const userMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content,
      });

      await this.messageRepository.create(userMessage, manager);
      await this.safeUpdateConversation(conversation, manager);
    });

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider ?? agent.provider ?? "ollama",
    );

    if (!aiProvider) {
      throw new AppError(
        `AI provider "${agent.aiModel?.provider}" is not configured.`,
        500,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    const history = await this.messageRepository.findRecentByConversationId(
      conversation.id,
      aiProvider.maxContextMessages,
    );

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const context = await this.aiContextService.build({
      userId,
      agentId: agent.id,
      conversation,
    });

    const ragResult = await this.buildRagSystemMessage({
      context,
      projectId: conversation.projectId || agent?.projectId,
      query: content,
    });

    messages.unshift(ragResult.message);

    const agentTools = await this.getAgentTools(agent.id);

    const toolMessages = [...messages];

    let response = await aiProvider.chat(toolMessages, {
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      tools: agentTools.schemas,
    });

    let toolIterations = 0;
    const maxToolIterations = 5;

    while (
      response.message?.tool_calls?.length > 0 &&
      toolIterations < maxToolIterations
    ) {
      toolIterations++;

      const assistantMessage = {
        role: "assistant",
        content: response.message.content ?? "",
        tool_calls: response.message.tool_calls,
      };

      toolMessages.push(assistantMessage);

      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function?.name;
        const toolArguments = toolCall.function?.arguments ?? {};

        if (typeof toolArguments === "string") {
          try {
            toolArguments = JSON.parse(toolArguments);
          } catch {
            throw new AppError(
              "Invalid agent tool arguments.",
              400,
              "INVALID_AGENT_TOOL_ARGUMENTS",
            );
          }
        }

        const tool = await this.agentToolResolverService.resolve(
          agent.id,
          toolName,
        );

        const result = await this.agentToolExecutorService.execute(
          tool,
          toolArguments,
          {
            conversationId: conversation.id,
            visitorId: conversation.visitorId,
            agentId: agent.id,
            projectId: agent.projectId,
          },
        );

        toolMessages.push({
          role: "tool",
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }

      response = await aiProvider.chat(toolMessages, {
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools: agentTools.schemas,
      });
    }

    if (response.message?.tool_calls?.length > 0) {
      throw new AppError(
        "Maximum tool execution limit reached.",
        400,
        "TOOL_ITERATION_LIMIT",
      );
    }

    const reply = response.message?.content ?? "";

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      await this.safeUpdateConversation(conversation, manager);

      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.create(assistantMessage, manager);
    });

    return {
      conversationId: conversation.id,
      agentId: conversation.agentId,
      reply,
      sources: ragResult.sources,
    };
  }

  async *streamMessage(
    userId,
    conversationId,
    content,
    agentId = null,
    projectId = null,
    options = {},
  ) {
    const requestStartedAt = Date.now();

    const intentStartedAt = Date.now();
    const isSimpleMessage = isSimpleConversationalMessage(content);
    const intentClassificationMs = Date.now() - intentStartedAt;
    const intent = isSimpleMessage ? "simple" : "knowledge_or_action";

    console.log("[CHAT INTENT]", {
      intent,
      ragEnabled: !isSimpleMessage,
      toolCount: isSimpleMessage ? 0 : null,
    });

    const logStage = (stage, startedAt) => {
      console.log("[CONVERSATION TIMING]", {
        stage,
        durationMs: Date.now() - startedAt,
        totalMs: Date.now() - requestStartedAt,
      });
    };

    let conversation;
    let agent;

    const setupStartedAt = Date.now();

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      if (conversationId) {
        conversation = await this.getConversation(
          userId,
          conversationId,
          manager,
        );

        agent = await this.getAgent(
          userId,
          conversation.agentId,
          conversation.projectId,
        );
      } else {
        agent = await this.getAgent(userId, agentId, projectId);

        conversation = new Conversation({
          userId,
          projectId: agent.projectId,
          agentId: agent.id,
          title: "New Conversation",
        });

        conversation = await this.conversationRepository.create(
          conversation,
          manager,
        );
      }

      if (!agent.project?.organizationId) {
        throw new AppError(
          "Agent organization could not be determined.",
          500,
          "ORGANIZATION_NOT_FOUND",
        );
      }

      await this.validateAgentModelAccess(agent);

      await this.checkPlanUsageUseCase.execute({
        organizationId: agent.project.organizationId,
      });

      const userMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content,
      });

      await this.messageRepository.create(userMessage, manager);
      await this.safeUpdateConversation(conversation, manager);
    });

    logStage("conversation_setup", setupStartedAt);

    const providerStartedAt = Date.now();

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider ?? agent.provider ?? "ollama",
    );

    if (!aiProvider) {
      throw new AppError(
        `AI provider "${agent.aiModel?.provider}" is not configured.`,
        500,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    logStage("ai_provider", providerStartedAt);

    const historyStartedAt = Date.now();

    const history = await this.messageRepository.findRecentByConversationId(
      conversation.id,
      aiProvider.maxContextMessages,
    );

    logStage("history", historyStartedAt);

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const contextStartedAt = Date.now();

    const context = await this.aiContextService.build({
      userId,
      agentId: agent.id,
      conversation,
    });

    logStage("ai_context", contextStartedAt);

    const promptBuildStartedAt = Date.now();

    let ragSources = [];
    let ragMs = 0;
    let tools = [];

    if (isSimpleMessage) {
      const systemMessage = this.aiContextService.buildSystemMessage(context, {
        lightweight: true,
      });

      messages.unshift(systemMessage);

      console.log("[CHAT INTENT]", {
        intent,
        ragEnabled: false,
        toolCount: 0,
      });
    } else {
      const ragStartedAt = Date.now();

      const ragResult = await this.buildRagSystemMessage({
        context,
        projectId: conversation.projectId || agent?.projectId,
        query: content,
      });

      ragMs = Date.now() - ragStartedAt;
      logStage("rag", ragStartedAt);

      if (ragResult.systemMessages && Array.isArray(ragResult.systemMessages)) {
        messages.unshift(...ragResult.systemMessages.slice().reverse());
      } else {
        messages.unshift(ragResult.message);
      }
      ragSources = ragResult.sources;

      const toolsStartedAt = Date.now();

      const agentTools = await this.agentToolRepository.findByAgentId(agent.id);
      tools = this.agentToolSchemaService.toOllamaTools(agentTools);

      logStage("agent_tools", toolsStartedAt);

      console.log("[CHAT INTENT]", {
        intent,
        ragEnabled: true,
        toolCount: tools.length,
      });
    }

    const promptBuildMs = Date.now() - promptBuildStartedAt;

    const promptCharacters = messages.reduce(
      (total, message) => total + (message.content?.length ?? 0),
      0,
    );

    console.log("[CONVERSATION TIMING SUMMARY]", {
      totalBeforeOllamaMs: Date.now() - requestStartedAt,
      intentClassificationMs,
      ragMs,
      promptBuildMs,
      messageCount: messages.length,
      promptCharacters,
      toolCount: tools.length,
    });

    let reply = "";
    let currentMessages = [...messages];

    let toolIterations = 0;
    const maxToolIterations = 5;

    let usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    let ollamaTotalMs = 0;
    let ollamaTtfbMs = null;

    const startedAt = Date.now();

    yield {
      type: "conversation",
      conversationId: conversation.id,
    };

    yield {
      type: "sources",
      sources: ragSources,
    };

    const dynamicMaxTokens = this.calculateDynamicMaxTokens({
      agentMaxTokens: agent.maxTokens,
      isSimpleMessage,
      hasRagSources: ragSources && ragSources.length > 0,
    });

    while (toolIterations < maxToolIterations) {
      let toolCalls = [];
      let streamedText = "";

      const ollamaStartedAt = Date.now();
      console.log("[ChatDebug] AI generation started");

      try {
        for await (const event of aiProvider.stream(currentMessages, {
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: dynamicMaxTokens,
          tools,
          signal: options?.signal,
        })) {
          if (event.type === "usage") {
            usage = {
              inputTokens: usage.inputTokens + (event.usage?.inputTokens ?? 0),
              outputTokens: usage.outputTokens + (event.usage?.outputTokens ?? 0),
              totalTokens: usage.totalTokens + (event.usage?.totalTokens ?? 0),
            };

            continue;
          }

          if (event.type === "timing") {
            ollamaTtfbMs = event.timing?.ollamaTtfbMs ?? ollamaTtfbMs;
            ollamaTotalMs = event.timing?.ollamaTotalMs ?? ollamaTotalMs;
            continue;
          }

          if (event.type === "token") {
            streamedText += event.content;
            reply += event.content;

            yield {
              type: "token",
              content: event.content,
            };

            continue;
          }

          if (event.type === "tool_calls") {
            toolCalls.push(...event.toolCalls);
            continue;
          }
        }
      } catch (aiErr) {
        console.error("[ChatDebug] AI generation error:", aiErr.message);

        if (reply.trim().length > 0) {
          console.warn(
            "[ChatDebug] AI stream interrupted midway - saving partial response",
            {
              replyLength: reply.length,
              error: aiErr.message,
            },
          );
          break;
        }

        throw aiErr;
      }

      const ollamaIterationMs = Date.now() - ollamaStartedAt;
      ollamaTotalMs += ollamaIterationMs;
      logStage("ollama_iteration", ollamaStartedAt);

      if (toolCalls.length === 0) {
        break;
      }

      currentMessages.push({
        role: "assistant",
        content: streamedText,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        let toolArguments = toolCall.function?.arguments ?? {};

        if (typeof toolArguments === "string") {
          try {
            toolArguments = JSON.parse(toolArguments);
          } catch {
            throw new AppError(
              "Invalid agent tool arguments.",
              400,
              "INVALID_AGENT_TOOL_ARGUMENTS",
            );
          }
        }

        const toolStartedAt = Date.now();

        const tool = await this.agentToolResolverService.resolve(
          agent.id,
          toolName,
        );

        yield {
          type: "tool_call",
          toolName,
        };

        const result = await this.agentToolExecutorService.execute(
          tool,
          toolArguments,
          {
            conversationId: conversation.id,
            visitorId: conversation.visitorId,
            agentId: agent.id,
            projectId: agent.projectId,
          },
        );

        logStage(`tool:${toolName}`, toolStartedAt);

        const toolResult =
          typeof result === "string" ? result : JSON.stringify(result);

        currentMessages.push({
          role: "tool",
          content: toolResult,
        });

        yield {
          type: "tool_result",
          toolName,
          content: toolResult,
        };
      }

      toolIterations++;
    }

    if (toolIterations >= maxToolIterations) {
      throw new AppError(
        "Maximum tool execution limit reached.",
        400,
        "TOOL_ITERATION_LIMIT",
      );
    }

    const persistenceStartedAt = Date.now();

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      const selectedModel = agent.aiModel?.model ?? agent.model ?? null;

      const costUsd = this.modelCostCalculatorService
        ? this.modelCostCalculatorService.calculateCost({
            modelName: selectedModel,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          })
        : 0;

      await this.usageRepository.create(
        new Usage({
          agentId: agent.id,
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          organizationId: agent.project?.organizationId ?? null,
          networkIdentityHash,
          modelName: selectedModel ?? null,
          costUsd,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          responseTimeMs: Date.now() - startedAt,
          status: "SUCCESS",
        }),
        manager,
      );

      await this.safeUpdateConversation(conversation, manager);

      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.create(assistantMessage, manager);
      console.log("[ChatDebug] final response persisted");
    });

    console.log("[CONVERSATION TIMING COMPLETE]", {
      totalMs: Date.now() - requestStartedAt,
      intentClassificationMs,
      ragMs,
      promptBuildMs,
      ollamaTtfbMs,
      ollamaTotalMs,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      toolIterations,
    });

    yield {
      type: "done",
    };
  }

  async sendPublicMessage(
    publicKey,
    content,
    visitorId,
    conversationId = null,
    networkIdentityHash = null,
  ) {
    let conversation;
    let agent;

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      agent = await this.agentRepository.findByPublicKey(publicKey);

      if (!agent) {
        throw new AppError(
          "Agent not found, please contact administration.",
          404,
          "PUBLIC_AGENT_NOT_FOUND",
        );
      }

      if (agent.visibility !== "PUBLIC") {
        throw new AppError("Agent is not public.", 403, "AGENT_NOT_PUBLIC");
      }

      if (!agent.project?.organizationId) {
        throw new AppError(
          "Agent organization could not be determined.",
          500,
          "ORGANIZATION_NOT_FOUND",
        );
      }
      await this.checkPlanUsageUseCase.execute({
        organizationId: agent.project.organizationId,
        visitorId,
        networkIdentityHash,
      });

      const timeZone = await this.getCompanyTimezone(
        agent.project?.organizationId,
      );

      if (conversationId) {
        const candidate = await this.conversationRepository.findById(
          conversationId,
          manager,
        );

        if (
          candidate &&
          !candidate.isCompleted &&
          candidate.agentId === agent.id &&
          candidate.visitorId === visitorId
        ) {
          conversation = candidate;
        }
      }

      if (!conversation) {
        const existingActiveConv =
          await this.conversationRepository.findLatestByVisitorAndAgent(
            visitorId,
            agent.id,
            manager,
          );

        if (
          existingActiveConv &&
          !existingActiveConv.isCompleted
        ) {
          conversation = existingActiveConv;
        } else {
          conversation = new Conversation({
            userId: null,
            visitorId,
            projectId: agent.projectId,
            agentId: agent.id,
            title: "New Conversation",
          });

          conversation = await this.conversationRepository.create(
            conversation,
            manager,
          );
        }
      }

      const userMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content,
      });

      await this.messageRepository.create(userMessage, manager);
      await this.safeUpdateConversation(conversation, manager);

      console.log(
        "[RealtimeDebug] Visitor message persisted & emitting event:",
        {
          event: "conversation.message.created",
          conversationId: conversation.id,
          projectId: conversation.projectId,
          messageId: userMessage.id,
          role: userMessage.role,
          createdAt: userMessage.createdAt,
        },
      );

      workspaceRealtimeEmitter.emit("conversation.message.created", {
        conversationId: conversation.id,
        projectId: conversation.projectId,
        message: {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt || new Date().toISOString(),
        },
        updatedAt: conversation.updatedAt
          ? conversation.updatedAt.toISOString()
          : new Date().toISOString(),
      });
    });

    const isHandoverTriggered = isHumanHandoverIntent(content);

    if (isHandoverTriggered && !conversation.isHandover) {
      const initialLead = await this.recordVisitorLeadIfPresent({
        conversation,
        content,
        agent,
      });

      const handoverResult = await this.toggleHandoverMode({
        conversationId: conversation.id,
        isHandover: true,
        lastMessage: content,
      });

      const notificationSuccess = Boolean(
        handoverResult?.notificationSent ?? conversation.notificationSent,
      );

      let replyText;
      if (notificationSuccess) {
        replyText = initialLead
          ? "Our support agent has been notified and will join your chat shortly. We've received your contact details and forwarded them to the team."
          : "Our support agent has been notified and will join your chat shortly. Feel free to leave your contact details or project requirements here so we can best assist you.";
      } else {
        replyText = initialLead
          ? "You have been connected to our support channel. Our automated notification system encountered a delay reaching our on-call agents, but your contact details have been saved for our team."
          : "You have been connected to our support channel. Our automated notification system encountered a delay reaching our on-call agents, but your request is queued. Please provide your name, phone number, or email here so our team can follow up with you directly.";
      }

      const assistantMsg = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: replyText,
      });
      await this.messageRepository.create(assistantMsg);
      await this.safeUpdateConversation(conversation);

      return {
        conversation,
        reply: replyText,
        isHandover: true,
      };
    }

    if (conversation.isHandover) {
      if (isReturnToAiIntent(content)) {
        await this.toggleHandoverMode({
          conversationId: conversation.id,
          isHandover: false,
          lastMessage: content,
        });
        conversation.isHandover = false;
        console.log("[ChatDebug] HANDOVER_RESET_TO_AI", {
          conversationId: conversation.id,
        });
      } else {
        await this.recordVisitorLeadIfPresent({
          conversation,
          content,
          agent,
        });

        return {
          conversation,
          reply: null,
          isHandover: true,
        };
      }
    }

    // In normal AI conversation, capture lead details if provided
    await this.recordVisitorLeadIfPresent({
      conversation,
      content,
      agent,
    });

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider ?? agent.provider ?? "ollama",
    );

    if (!aiProvider) {
      throw new AppError(
        `AI provider "${agent.aiModel?.provider}" is not configured.`,
        500,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    const history = await this.messageRepository.findRecentByConversationId(
      conversation.id,
      aiProvider.maxContextMessages,
    );

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const context = await this.aiContextService.buildPublic({
      agentId: agent.id,
      conversation,
    });

    const ragResult = await this.buildRagSystemMessage({
      context,
      projectId: conversation.projectId || agent?.projectId,
      query: content,
      isPublic: true,
    });

    messages.unshift(ragResult.message);

    const agentTools = await this.agentToolRepository.findByAgentId(agent.id);

    const tools = agentTools
      .filter((tool) => tool.enabled)
      .map((tool) => ({
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
      }));

    let currentMessages = [...messages];
    let reply = "";

    let toolIterations = 0;
    const maxToolIterations = 5;

    while (toolIterations < maxToolIterations) {
      const response = await aiProvider.chat(currentMessages, {
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools,
      });

      const toolCalls = response.message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        reply = response.message?.content ?? "";
        break;
      }

      currentMessages.push({
        role: "assistant",
        content: response.message?.content ?? "",
        tool_calls: toolCalls,
      });

      for (const toolCall of response.message.tool_calls) {
        const toolName = toolCall.function?.name;
        const toolArguments = toolCall.function?.arguments ?? {};

        if (typeof toolArguments === "string") {
          try {
            toolArguments = JSON.parse(toolArguments);
          } catch {
            throw new AppError(
              "Invalid agent tool arguments.",
              400,
              "INVALID_AGENT_TOOL_ARGUMENTS",
            );
          }
        }

        const tool = await this.agentToolResolverService.resolve(
          agent.id,
          toolName,
        );

        const result = await this.agentToolExecutorService.execute(
          tool,
          toolArguments,
          {
            conversationId: conversation.id,
            visitorId: conversation.visitorId,
            agentId: agent.id,
            projectId: agent.projectId,
          },
        );
        const toolResult =
          typeof result === "string" ? result : JSON.stringify(result);

        currentMessages.push({
          role: "tool",
          content: toolResult,
        });
      }

      toolIterations++;
    }

    if (toolIterations >= maxToolIterations && !reply) {
      throw new AppError(
        "Maximum tool execution limit reached.",
        400,
        "TOOL_ITERATION_LIMIT",
      );
    }

    if (!reply || reply.trim().length === 0) {
      reply =
        "క్షమించండి, ప్రస్తుతం స్పందించలేకపోయాను. దయచేసి మీ సందేశాన్ని మళ్లీ పంపండి. (I apologize, I could not generate a response right now. Please try sending your message again.)";
    }

    await executeTransaction(async (queryRunner) => {
      await this.safeUpdateConversation(conversation, queryRunner.manager);

      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.createForStreaming(
        assistantMessage,
        queryRunner.manager,
      );

      await this.usageRepository.create(
        new Usage({
          agentId: agent.id,
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          organizationId: agent.project?.organizationId ?? null,
          networkIdentityHash,
          modelName: agent.aiModel?.providerModelId ?? agent.model ?? null,
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          responseTimeMs: 0,
          status: "SUCCESS",
        }),
        queryRunner.manager,
      );
    });

    return {
      conversationId: conversation.id,
      agentId: conversation.agentId,
      reply,
      sources: ragResult.sources,
    };
  }

  async *streamPublicMessage(
    publicKey,
    content,
    visitorId,
    conversationId = null,
    networkIdentityHash = null,
    options = {},
  ) {
    const requestStartedAt = Date.now();

    const intentStartedAt = Date.now();
    const isSimpleMessage = isSimpleConversationalMessage(content);
    const intentClassificationMs = Date.now() - intentStartedAt;

    const intent = isSimpleMessage ? "simple" : "knowledge_or_action";

    const logStage = (stage, startedAt) => {
      console.log("[PUBLIC STREAM STAGE]", {
        stage,
        durationMs: Date.now() - startedAt,
      });
    };

    console.log("[CHAT INTENT]", {
      intent,
      ragEnabled: !isSimpleMessage,
      toolCount: isSimpleMessage ? 0 : null,
    });

    let conversation;
    let agent;
    let planUsage;
    let createdUserMessageId = null;

    const requestId = options?.requestId ?? "public-req";

    /*
     * Agent resolution
     */

    const agentStartedAt = Date.now();

    console.log("[PublicChatDebug] AGENT_LOOKUP_START", {
      requestId,
      publicKeyPresent: Boolean(publicKey),
    });

    agent = await this.agentRepository.findByPublicKey(publicKey);

    if (!agent) {
      console.log("[PublicChatDebug] AGENT_LOOKUP_FAILED", {
        requestId,
        errorCode: "PUBLIC_AGENT_NOT_FOUND",
        message: "Agent not found, please contact administration.",
      });
      throw new AppError(
        "Agent not found, please contact administration.",
        404,
        "PUBLIC_AGENT_NOT_FOUND",
      );
    }

    if (agent.visibility !== "PUBLIC") {
      console.log("[PublicChatDebug] AGENT_LOOKUP_FAILED", {
        requestId,
        errorCode: "AGENT_NOT_PUBLIC",
        message: "Agent is not public.",
      });
      throw new AppError("Agent is not public.", 403, "AGENT_NOT_PUBLIC");
    }

    if (!agent.project?.organizationId) {
      console.log("[PublicChatDebug] AGENT_LOOKUP_FAILED", {
        requestId,
        errorCode: "ORGANIZATION_NOT_FOUND",
        message: "Agent organization could not be determined.",
      });
      throw new AppError(
        "Agent organization could not be determined.",
        500,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    console.log("[PublicChatDebug] AGENT_LOOKUP_SUCCESS", {
      requestId,
      agentId: agent.id,
      projectId: agent.projectId,
      organizationId: agent.project?.organizationId,
    });

    console.log("[PublicChatDebug] PROJECT_RESOLUTION_START", { requestId });
    if (agent.projectId) {
      console.log("[PublicChatDebug] PROJECT_RESOLUTION_RESULT", {
        requestId,
        projectId: agent.projectId,
        organizationId: agent.project?.organizationId,
      });
    } else {
      console.log("[PublicChatDebug] PROJECT_ID_MISSING", {
        requestId,
        agentId: agent.id,
        organizationId: agent.project?.organizationId,
      });
    }

    /*
     * Preflight: Model access validation & Plan usage check in parallel
     */
    const preflightStartedAt = Date.now();

    const [, resolvedPlanUsage] = await Promise.all([
      this.validateAgentModelAccess(agent),
      this.checkPlanUsageUseCase.execute({
        organizationId: agent.project.organizationId,
        visitorId,
        networkIdentityHash,
      }),
    ]);
    planUsage = resolvedPlanUsage;

    const agentResolutionMs = Date.now() - agentStartedAt;
    const planUsageMs = Date.now() - preflightStartedAt;

    logStage("agent_resolution", agentStartedAt);
    logStage("plan_usage", preflightStartedAt);

    /*
     * Conversation setup
     *
     * Transaction contains only database writes
     * and conversation ownership validation.
     */

    const conversationSetupStartedAt = Date.now();

    console.log("[PublicChatDebug] TRANSACTION_START", { requestId });

    try {
      await executeTransaction(async (queryRunner) => {
        const manager = queryRunner.manager;

        const timeZone = await this.getCompanyTimezone(
          agent.project?.organizationId,
        );

        console.log("[PublicChatDebug] CONVERSATION_LOOKUP_START", {
          requestId,
          conversationId: conversationId ?? null,
          projectId: agent.projectId,
          organizationId: agent.project?.organizationId,
        });

        if (conversationId) {
          const candidate = await this.conversationRepository.findById(
            conversationId,
            manager,
          );

          if (
            candidate &&
            !candidate.isCompleted &&
            candidate.agentId === agent.id &&
            (!visitorId ||
              candidate.visitorId === visitorId ||
              candidate.visitorId === null)
          ) {
            conversation = candidate;
            console.log("[PublicChatDebug] CONVERSATION_FOUND", {
              requestId,
              conversationId: conversation.id,
              projectId: conversation.projectId,
            });
          }
        }

        if (!conversation) {
          const existingActiveConv =
            await this.conversationRepository.findLatestByVisitorAndAgent(
              visitorId,
              agent.id,
              manager,
            );

          if (
            existingActiveConv &&
            !existingActiveConv.isCompleted
          ) {
            conversation = existingActiveConv;
            console.log("[PublicChatDebug] CONVERSATION_FOUND", {
              requestId,
              conversationId: conversation.id,
              projectId: conversation.projectId,
            });
          } else {
            console.log("[PublicChatDebug] CONVERSATION_NOT_FOUND", {
              requestId,
            });
            console.log("[PublicChatDebug] CONVERSATION_CREATE_START", {
              requestId,
              projectId: agent.projectId,
              organizationId: agent.project?.organizationId,
              agentId: agent.id,
            });

            try {
              conversation = new Conversation({
                userId: null,
                visitorId,
                projectId: agent.projectId,
                agentId: agent.id,
                title: "New Conversation",
              });

              conversation =
                await this.conversationRepository.createForStreaming(
                  conversation,
                  manager,
                );

              console.log("[PublicChatDebug] CONVERSATION_CREATE_SUCCESS", {
                requestId,
                conversationId: conversation.id,
                projectId: conversation.projectId,
              });
            } catch (createErr) {
              console.error("[PublicChatDebug] CONVERSATION_CREATE_FAILED", {
                requestId,
                errorName: createErr.name,
                errorCode: createErr.code || createErr.errorCode,
                message: createErr.message,
                databaseCode: createErr.code,
                stack: createErr.stack,
              });
              throw createErr;
            }
          }
        }

        console.log("[PublicChatDebug] USER_MESSAGE_CREATE_START", {
          requestId,
          conversationId: conversation.id,
          messageLength: content ? content.length : 0,
        });

        try {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const rawClientMessageId = options?.clientMessageId || null;
          const clientMessageId =
            rawClientMessageId && UUID_REGEX.test(rawClientMessageId)
              ? rawClientMessageId
              : null;
          let userMessage = null;

          if (clientMessageId) {
            const existingMessage = await this.messageRepository.findById
              ? await this.messageRepository.findById(clientMessageId, manager)
              : null;
            if (existingMessage) {
              userMessage = existingMessage;
              console.log("[PublicChatDebug] USER_MESSAGE_IDEMPOTENT_REUSE", {
                requestId,
                messageId: userMessage.id,
                conversationId: conversation.id,
              });
            }
          }

          if (!userMessage) {
            userMessage = new Message({
              id: clientMessageId || crypto.randomUUID(),
              conversationId: conversation.id,
              role: MessageRole.USER,
              content,
            });

            await this.messageRepository.create(userMessage, manager);
            await this.safeUpdateConversation(conversation, manager);
            createdUserMessageId = userMessage.id;

            console.log("[PublicChatDebug] USER_MESSAGE_CREATE_SUCCESS", {
              requestId,
              messageId: userMessage.id,
              conversationId: conversation.id,
            });

            workspaceRealtimeEmitter.emit("conversation.message.created", {
              conversationId: conversation.id,
              projectId: conversation.projectId,
              message: {
                id: userMessage.id,
                role: userMessage.role,
                content: userMessage.content,
                createdAt: userMessage.createdAt || new Date().toISOString(),
              },
              updatedAt: conversation.updatedAt
                ? conversation.updatedAt.toISOString()
                : new Date().toISOString(),
            });
          }
        } catch (msgErr) {
          console.error("[PublicChatDebug] USER_MESSAGE_CREATE_FAILED", {
            requestId,
            errorName: msgErr.name,
            errorCode: msgErr.code || msgErr.errorCode,
            message: msgErr.message,
          });
          throw msgErr;
        }
      });
      console.log("[PublicChatDebug] TRANSACTION_COMMIT", { requestId });
    } catch (txErr) {
      console.error("[PublicChatDebug] TRANSACTION_ROLLBACK", {
        requestId,
        reason: txErr.message,
        errorCode: txErr.code || txErr.errorCode,
        message: txErr.message,
        stack: txErr.stack,
      });
      throw txErr;
    }

    yield {
      type: "conversation",
      conversationId: conversation.id,
    };

    console.log("[PublicChatDebug] POST_TRANSACTION_START", {
      requestId,
      conversationId: conversation.id,
    });

    const isHandoverTriggered = isHumanHandoverIntent(content);

    console.log("[PublicChatDebug] HANDOVER_CHECK", {
      requestId,
      isHandoverTriggered,
      isHandover: Boolean(conversation.isHandover),
    });

    if (isHandoverTriggered && !conversation.isHandover) {
      const initialLead = await this.recordVisitorLeadIfPresent({
        conversation,
        content,
        agent,
      });

      const handoverResult = await this.toggleHandoverMode({
        conversationId: conversation.id,
        isHandover: true,
        lastMessage: content,
      });

      const notificationSuccess = Boolean(
        handoverResult?.notificationSent ?? conversation.notificationSent,
      );

      let noticeText;
      if (notificationSuccess) {
        noticeText = initialLead
          ? "Our support agent has been notified and will join your chat shortly. We've received your contact details and forwarded them to the team."
          : "Our support agent has been notified and will join your chat shortly. Feel free to leave your contact details or project requirements here so we can best assist you.";
      } else {
        noticeText = initialLead
          ? "You have been connected to our support channel. Our automated notification system encountered a delay reaching our on-call agents, but your contact details have been saved for our team."
          : "You have been connected to our support channel. Our automated notification system encountered a delay reaching our on-call agents, but your request is queued. Please provide your name, phone number, or email here so our team can follow up with you directly.";
      }

      const assistantMsg = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: noticeText,
      });
      await this.messageRepository.create(assistantMsg);

      yield {
        type: "token",
        content: noticeText,
      };
      yield { type: "done" };
      return;
    }

    if (conversation.isHandover) {
      if (isReturnToAiIntent(content)) {
        await this.toggleHandoverMode({
          conversationId: conversation.id,
          isHandover: false,
          lastMessage: content,
        });
        conversation.isHandover = false;
        console.log("[PublicChatDebug] HANDOVER_RESET_TO_AI", {
          requestId,
          conversationId: conversation.id,
        });
      } else {
        console.log("[PublicChatDebug] CONVERSATION_IS_IN_HANDOVER_MODE", {
          requestId,
          conversationId: conversation.id,
        });

        const capturedLead = await this.recordVisitorLeadIfPresent({
          conversation,
          content,
          agent,
        });

        const handoverNotice = capturedLead
          ? "Thank you! Your contact details have been recorded and sent to our support team. A representative will reach out to you shortly."
          : isHumanHandoverIntent(content)
            ? "Your request has already been sent to our support team, and an agent has been notified. They will join this chat or reach out to you shortly."
            : "Your conversation is currently connected with support. A representative will respond to your messages shortly. (To switch back to the AI assistant, say 'back to AI' or click 'Return to AI').";

        yield {
          type: "token",
          content: handoverNotice,
        };
        yield { type: "done" };
        return;
      }
    }

    // In normal AI conversation, capture lead details if provided
    await this.recordVisitorLeadIfPresent({
      conversation,
      content,
      agent,
    });

    const conversationSetupMs = Date.now() - conversationSetupStartedAt;

    logStage("conversation_setup", conversationSetupStartedAt);

    console.log("PUBLIC AGENT PLAN CHECK:", {
      agentId: agent.id,
      projectId: agent.projectId,
      organizationId: agent.project?.organizationId,
      requestsUsed: planUsage.usage.daily.requests,
      requestsLimit: planUsage.limits.requestsPerDay,
    });

    /*
     * Provider
     */

    const providerStartedAt = Date.now();

    const providerName = agent.aiModel?.provider ?? agent.provider ?? "ollama";
    console.log("[PublicChatDebug] AI_PROVIDER_RESOLUTION_START", {
      requestId,
      providerName,
    });

    const aiProvider = this.aiProviderFactory.getProviderByName(providerName);

    if (!aiProvider) {
      console.error("[PublicChatDebug] AI_PROVIDER_RESOLUTION_FAILED", {
        requestId,
        providerName,
      });
      throw new AppError(
        `AI provider "${providerName}" is not configured.`,
        500,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    console.log("[PublicChatDebug] AI_PROVIDER_RESOLVED", {
      requestId,
      providerName,
    });

    const providerResolutionMs = Date.now() - providerStartedAt;

    /*
     * Context, History, RAG & Tools (Concurrent Fetching)
     */
    const prepareStartedAt = Date.now();
    const targetProjectId = conversation.projectId || agent?.projectId;

    console.log("[PublicChatDebug] PROMPT_DATA_FETCH_START", {
      requestId,
      conversationId: conversation.id,
      isSimpleMessage,
    });

    const [history, context, preloadedKnowledgeResults, rawTools] =
      await Promise.all([
        this.messageRepository.findRecentByConversationId(
          conversation.id,
          aiProvider.maxContextMessages,
        ),
        this.aiContextService.buildPublic({
          agent,
          project: agent.project,
          conversation,
        }),
        !isSimpleMessage && targetProjectId && this.knowledgeSearchService
          ? this.knowledgeSearchService
              .search({
                projectId: targetProjectId,
                query: content,
              })
              .catch((ragErr) => {
                console.warn(
                  "[RAG_SEARCH_FALLBACK] Knowledge search failed, continuing with agent prompt instructions:",
                  ragErr.message,
                );
                return [];
              })
          : Promise.resolve([]),
        !isSimpleMessage && this.agentToolRepository
          ? this.agentToolRepository.findByAgentId(agent.id)
          : Promise.resolve([]),
      ]);

    const historyMs = Date.now() - prepareStartedAt;
    const contextMs = historyMs;
    logStage("history_and_context_parallel", prepareStartedAt);

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    // Ensure the current user message is always the final turn in history
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== content) {
      const existingIdx = messages.findLastIndex
        ? messages.findLastIndex(
            (m) => m.role === "user" && m.content === content,
          )
        : -1;
      if (existingIdx !== -1) {
        messages.splice(existingIdx, 1);
      }
      messages.push({
        role: MessageRole.USER,
        content,
      });
    }

    // If an immediately preceding message was also a user message (orphaned from a prior failed attempt),
    // and current turn is a simple greeting, drop the abandoned query so AI greets freshly.
    if (messages.length >= 2) {
      const secondLastMsg = messages[messages.length - 2];
      if (secondLastMsg.role === "user" && isSimpleMessage) {
        messages.splice(messages.length - 2, 1);
      }
    }

    /*
     * RAG / tools prompt assembly
     */
    const promptBuildStartedAt = Date.now();
    let ragSources = [];
    let ragMs = 0;
    let tools = [];

    console.log("[PublicChatDebug] PROMPT_BUILD_START", {
      requestId,
      isSimpleMessage,
    });

    if (isSimpleMessage) {
      const systemMessage = this.aiContextService.buildSystemMessage(context, {
        lightweight: true,
      });

      messages.unshift(systemMessage);
    } else {
      const ragBuildStartedAt = Date.now();

      const ragResult = await this.buildRagSystemMessage({
        context,
        projectId: targetProjectId,
        query: content,
        isPublic: true,
        preloadedKnowledgeResults,
      });

      ragMs = Date.now() - ragBuildStartedAt;
      logStage("rag", ragBuildStartedAt);

      if (ragResult.systemMessages && Array.isArray(ragResult.systemMessages)) {
        messages.unshift(...ragResult.systemMessages);
      } else {
        messages.unshift(ragResult.message);
      }
      ragSources = ragResult.sources;

      if (rawTools && Array.isArray(rawTools) && rawTools.length > 0) {
        tools = this.agentToolSchemaService.toOllamaTools(rawTools);
      }
    }

    const promptBuildMs = Date.now() - promptBuildStartedAt;

    console.log("[PublicChatDebug] PROMPT_BUILD_SUCCESS", {
      requestId,
      messageCount: messages.length,
      ragSourcesCount: ragSources ? ragSources.length : 0,
    });

    console.log("[CHAT INTENT]", {
      intent,
      ragEnabled: !isSimpleMessage,
      toolCount: tools.length,
    });

    const promptCharacters = messages.reduce(
      (total, message) => total + (message.content?.length ?? 0),
      0,
    );

    console.log("[PUBLIC STREAM TIMING SUMMARY]", {
      totalBeforeOllamaMs: Date.now() - requestStartedAt,
      intentClassificationMs,
      agentResolutionMs,
      planUsageMs,
      conversationSetupMs,
      providerResolutionMs,
      historyMs,
      contextMs,
      ragMs,
      promptBuildMs,
      messageCount: messages.length,
      promptCharacters,
      toolCount: tools.length,
    });

    /*
     * Streaming
     */

    let reply = "";

    let currentMessages = [...messages];

    let usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    let ollamaTotalMs = 0;
    let ollamaTtfbMs = null;

    const startedAt = Date.now();

    let toolIterations = 0;
    const maxToolIterations = 5;

    yield {
      type: "sources",
      sources: ragSources,
    };

    const dynamicMaxTokens = this.calculateDynamicMaxTokens({
      agentMaxTokens: agent.maxTokens,
      isSimpleMessage,
      hasRagSources: ragSources && ragSources.length > 0,
    });

    console.log("[PublicChatDebug] AI_GENERATION_START", {
      requestId,
      conversationId: conversation.id,
      agentId: agent.id,
      provider: agent.aiModel?.provider ?? agent.provider ?? "ollama",
      model: agent.model,
    });

    let chunkCount = 0;
    let isFirstChunk = true;

    while (toolIterations < maxToolIterations) {
      let toolCalls = [];
      let streamedText = "";

      const ollamaStartedAt = Date.now();

      try {
        for await (const event of aiProvider.stream(currentMessages, {
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: dynamicMaxTokens,
          tools,
          signal: options?.signal,
        })) {
          if (event.type === "usage") {
            usage = {
              inputTokens: usage.inputTokens + (event.usage?.inputTokens ?? 0),
              outputTokens:
                usage.outputTokens + (event.usage?.outputTokens ?? 0),
              totalTokens: usage.totalTokens + (event.usage?.totalTokens ?? 0),
            };

            continue;
          }

          if (event.type === "timing") {
            ollamaTtfbMs = event.timing?.ollamaTtfbMs ?? ollamaTtfbMs;
            ollamaTotalMs = event.timing?.ollamaTotalMs ?? ollamaTotalMs;
            continue;
          }

          if (event.type === "token") {
            streamedText += event.content;
            reply += event.content;
            chunkCount++;

            if (isFirstChunk) {
              isFirstChunk = false;
              console.log("[PublicChatDebug] AI_FIRST_CHUNK", {
                requestId,
                conversationId: conversation.id,
                chunkLength: event.content.length,
              });
            } else if (chunkCount % 10 === 0) {
              console.log("[PublicChatDebug] AI_CHUNK_PROGRESS", {
                requestId,
                conversationId: conversation.id,
                chunkCount,
                accumulatedLength: reply.length,
              });
            }

            yield {
              type: "token",
              content: event.content,
            };

            continue;
          }

          if (event.type === "tool_calls") {
            toolCalls.push(...event.toolCalls);
          }
        }
      } catch (aiErr) {
        console.error("[PublicChatDebug] AI_GENERATION_FAILED", {
          requestId,
          provider: agent.aiModel?.provider ?? agent.provider ?? "ollama",
          model: agent.model,
          errorName: aiErr.name,
          errorCode: aiErr.code || aiErr.errorCode,
          message: aiErr.message,
        });

        if (chunkCount > 0 && reply.trim().length > 0) {
          console.warn(
            "[PublicChatDebug] AI_STREAM_INTERRUPTED_MIDWAY - preserving partial response",
            {
              requestId,
              chunkCount,
              replyLength: reply.length,
              error: aiErr.message,
            },
          );
          break;
        }

        if (
          chunkCount === 0 &&
          (providerName === "ollama" || !agent.aiModel?.provider) &&
          this.aiProviderFactory.getProviderByName("openai")
        ) {
          console.warn(
            "[PublicChatDebug] OLLAMA_OFFLINE_FALLBACK_TO_OPENAI - retrying with OpenRouter/OpenAI provider",
            { requestId, originalError: aiErr.message },
          );
          try {
            const fallbackProvider =
              this.aiProviderFactory.getProviderByName("openai");
            const fallbackModel =
              process.env.OPENAI_MODEL ||
              "nvidia/nemotron-3-super-120b-a12b:free";
            for await (const event of fallbackProvider.stream(currentMessages, {
              model: fallbackModel,
              temperature: agent.temperature,
              maxTokens: dynamicMaxTokens,
              tools,
              signal: options?.signal,
            })) {
              if (event.type === "usage") {
                usage = {
                  inputTokens:
                    usage.inputTokens + (event.usage?.inputTokens ?? 0),
                  outputTokens:
                    usage.outputTokens + (event.usage?.outputTokens ?? 0),
                  totalTokens:
                    usage.totalTokens + (event.usage?.totalTokens ?? 0),
                };
                continue;
              }

              if (event.type === "timing") {
                ollamaTtfbMs = event.timing?.ollamaTtfbMs ?? ollamaTtfbMs;
                ollamaTotalMs = event.timing?.ollamaTotalMs ?? ollamaTotalMs;
                continue;
              }

              if (event.type === "token") {
                streamedText += event.content;
                reply += event.content;
                chunkCount++;

                if (isFirstChunk) {
                  isFirstChunk = false;
                  console.log("[PublicChatDebug] AI_FIRST_CHUNK", {
                    requestId,
                    conversationId: conversation.id,
                    chunkLength: event.content.length,
                  });
                } else if (chunkCount % 10 === 0) {
                  console.log("[PublicChatDebug] AI_CHUNK_PROGRESS", {
                    requestId,
                    conversationId: conversation.id,
                    chunkCount,
                    accumulatedLength: reply.length,
                  });
                }

                yield {
                  type: "token",
                  content: event.content,
                };

                continue;
              }

              if (event.type === "tool_calls") {
                toolCalls.push(...event.toolCalls);
              }
            }
          } catch (fallbackErr) {
            console.error(
              "[PublicChatDebug] FALLBACK_AI_GENERATION_FAILED",
              fallbackErr.message,
            );
            if (
              chunkCount === 0 &&
              createdUserMessageId &&
              typeof this.messageRepository.delete === "function"
            ) {
              try {
                await this.messageRepository.delete(
                  createdUserMessageId,
                  conversation.id,
                );
              } catch (_) {}
            }
            throw fallbackErr;
          }
        } else {
          if (
            chunkCount === 0 &&
            createdUserMessageId &&
            typeof this.messageRepository.delete === "function"
          ) {
            try {
              await this.messageRepository.delete(
                createdUserMessageId,
                conversation.id,
              );
              console.log("[PublicChatDebug] CLEANED_UP_ORPHANED_USER_MESSAGE", {
                requestId,
                messageId: createdUserMessageId,
                conversationId: conversation.id,
              });
            } catch (cleanupErr) {
              console.warn(
                "[PublicChatDebug] FAILED_TO_CLEAN_UP_USER_MESSAGE",
                cleanupErr.message,
              );
            }
          }

          throw aiErr;
        }
      }

      console.log("[PublicChatDebug] AI_GENERATION_COMPLETE", {
        requestId,
        conversationId: conversation.id,
        chunkCount,
        totalLength: reply.length,
      });

      const ollamaIterationMs = Date.now() - ollamaStartedAt;

      if (ollamaTotalMs === 0) {
        ollamaTotalMs = ollamaIterationMs;
      }

      if (toolCalls.length === 0) {
        break;
      }

      currentMessages.push({
        role: "assistant",
        content: streamedText,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;

        let toolArguments = toolCall.function?.arguments ?? {};

        if (typeof toolArguments === "string") {
          try {
            toolArguments = JSON.parse(toolArguments);
          } catch {
            throw new AppError(
              "Invalid agent tool arguments.",
              400,
              "INVALID_AGENT_TOOL_ARGUMENTS",
            );
          }
        }

        const toolStartedAt = Date.now();

        const tool = await this.agentToolResolverService.resolve(
          agent.id,
          toolName,
        );

        yield {
          type: "tool_call",
          toolName,
        };

        const result = await this.agentToolExecutorService.execute(
          tool,
          toolArguments,
          {
            conversationId: conversation.id,
            visitorId: conversation.visitorId,
            agentId: agent.id,
            projectId: agent.projectId,
          },
        );

        logStage(`tool:${toolName}`, toolStartedAt);

        const toolResult =
          typeof result === "string" ? result : JSON.stringify(result);

        currentMessages.push({
          role: "tool",
          content: toolResult,
        });

        yield {
          type: "tool_result",
          toolName,
          content: toolResult,
        };
      }

      toolIterations++;
    }

    if (toolIterations >= maxToolIterations) {
      throw new AppError(
        "Maximum tool execution limit reached.",
        400,
        "TOOL_ITERATION_LIMIT",
      );
    }

    if (!reply || reply.trim().length === 0) {
      const fallbackText =
        "క్షమించండి, ప్రస్తుతం స్పందించలేకపోయాను. దయచేసి మీ సందేశాన్ని మళ్లీ పంపండి. (I apologize, I could not generate a response right now. Please try sending your message again.)";
      reply = fallbackText;
      yield {
        type: "token",
        content: fallbackText,
      };
    }

    /*
     * Persistence
     */

    const persistenceStartedAt = Date.now();

    console.log("[PublicChatDebug] ASSISTANT_MESSAGE_SAVE_START", {
      requestId,
      conversationId: conversation.id,
      responseLength: reply.length,
    });

    try {
      await executeTransaction(async (queryRunner) => {
        const manager = queryRunner.manager;
        const selectedModel = agent.aiModel?.model ?? agent.model ?? null;

        const costUsd = this.modelCostCalculatorService
          ? this.modelCostCalculatorService.calculateCost({
              modelName: selectedModel,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            })
          : 0;

        await this.usageRepository.create(
          new Usage({
            agentId: agent.id,
            conversationId: conversation.id,
            visitorId: conversation.visitorId,
            organizationId: agent.project?.organizationId ?? null,
            networkIdentityHash,
            modelName: selectedModel ?? null,
            costUsd,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            responseTimeMs: Date.now() - startedAt,
            status: "SUCCESS",
          }),
          manager,
        );

        await this.safeUpdateConversation(conversation, manager);

        const assistantMessage = new Message({
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: reply,
        });

        await this.messageRepository.create(assistantMessage, manager);
      });

      console.log("[PublicChatDebug] ASSISTANT_MESSAGE_SAVE_SUCCESS", {
        requestId,
        conversationId: conversation.id,
      });
    } catch (saveErr) {
      console.error("[PublicChatDebug] ASSISTANT_MESSAGE_SAVE_FAILED", {
        requestId,
        errorName: saveErr.name,
        errorCode: saveErr.code || saveErr.errorCode,
        message: saveErr.message,
      });
      throw saveErr;
    }

    console.log("[PublicChatDebug] CONVERSATION_STATUS_UPDATE", {
      requestId,
      conversationId: conversation.id,
      status: conversation.isCompleted ? "COMPLETED" : "ACTIVE",
    });

    console.log("[PublicChatDebug] CONVERSATION_STATUS_UPDATED", {
      requestId,
      conversationId: conversation.id,
      status: conversation.isCompleted ? "COMPLETED" : "ACTIVE",
    });

    const persistenceMs = Date.now() - persistenceStartedAt;

    logStage("persistence", persistenceStartedAt);

    const dailyOrganizationLimit =
      planUsage?.limits?.requestsPerDay ?? null;

    const dailyOrganizationUsed =
      (planUsage?.usage?.daily?.requests ?? 0) + 1;

    const dailyOrganizationRemaining =
      dailyOrganizationLimit !== null
        ? Math.max(dailyOrganizationLimit - dailyOrganizationUsed, 0)
        : null;

    const dailyVisitorLimit =
      planUsage?.limits?.messagesPerVisitorPerDay ??
      planUsage?.limits?.requestsPerVisitorPerDay ??
      null;

    const dailyVisitorUsed =
      (planUsage?.usage?.visitor?.dailyMessages ??
        planUsage?.usage?.visitor?.dailyRequests ??
        0) + 1;

    const dailyVisitorRemaining =
      dailyVisitorLimit !== null
        ? Math.max(dailyVisitorLimit - dailyVisitorUsed, 0)
        : null;

    yield {
      type: "usage_limit",
      usage: {
        organization: {
          used: dailyOrganizationUsed,
          limit: dailyOrganizationLimit,
          remaining: dailyOrganizationRemaining,
        },

        visitor: {
          used: dailyVisitorUsed,
          limit: dailyVisitorLimit,
          remaining: dailyVisitorRemaining,
        },
      },
    };

    console.log("[PUBLIC STREAM TIMING COMPLETE]", {
      totalMs: Date.now() - requestStartedAt,

      intentClassificationMs,

      agentResolutionMs,
      planUsageMs,
      conversationSetupMs,

      providerResolutionMs,

      historyMs,
      contextMs,

      ragMs,
      promptBuildMs,

      ollamaTtfbMs,
      ollamaTotalMs,

      persistenceMs,

      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,

      toolIterations,
    });

    yield {
      type: "done",
    };
  }

  async getConversationMessages(userId, conversationId) {
    const conversation = await this.getConversation(userId, conversationId);

    const messages = await this.messageRepository.findByConversationId(
      conversation.id,
    );

    return {
      conversation,
      messages,
    };
  }

  async updateConversationTitle(userId, conversationId, title) {
    const conversation = await this.getConversation(userId, conversationId);

    conversation.updateTitle(title);

    return await this.conversationRepository.update(conversation);
  }

  async deleteConversation(userId, conversationId) {
    const conversation = await this.getConversation(userId, conversationId);

    await this.conversationRepository.delete(conversation.id);
  }

  async getPublicConversationMessages(publicKey, conversationId, visitorId) {
    const agent = await this.agentRepository.findByPublicKey(publicKey);
    if (!agent) {
      throw new AppError("Agent not found.", 404, "PUBLIC_AGENT_NOT_FOUND");
    }

    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new AppError(
        "Conversation not found.",
        404,
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (conversation.agentId !== agent.id) {
      throw new AppError(
        "Conversation does not belong to this agent.",
        403,
        "INVALID_PUBLIC_CONVERSATION",
      );
    }

    if (conversation.visitorId !== visitorId) {
      throw new AppError(
        "Conversation does not belong to this visitor.",
        403,
        "INVALID_PUBLIC_CONVERSATION",
      );
    }

    const messages = await this.messageRepository.findByConversationId(
      conversation.id,
    );

    return {
      conversation: {
        id: conversation.id,
        isHandover: Boolean(conversation.isHandover),
        isCompleted: Boolean(conversation.isCompleted),
        isAgentTyping: conversation.isHandover
          ? this.isAgentTyping(conversation.id)
          : false,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async getPublicActiveConversation(
    publicKey,
    visitorId,
    networkIdentityHash = null,
    conversationId = null,
  ) {
    if (!publicKey) {
      throw new AppError("Public key is required.", 400, "PUBLIC_KEY_REQUIRED");
    }

    const agent = await this.agentRepository.findByPublicKey(publicKey);
    if (!agent) {
      throw new AppError("Agent not found.", 404, "PUBLIC_AGENT_NOT_FOUND");
    }

    if (agent.visibility !== "PUBLIC") {
      throw new AppError("Agent is not public.", 403, "AGENT_NOT_PUBLIC");
    }

    const dailyRequestsPromise = (async () => {
      if (!this.checkPlanUsageUseCase || !agent.project?.organizationId) {
        return null;
      }
      try {
        const usageState = await Promise.race([
          this.checkPlanUsageUseCase.getUsageState({
            organizationId: agent.project.organizationId,
            visitorId,
            networkIdentityHash,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Usage check timeout")), 2500),
          ),
        ]);

        if (usageState?.usage) {
          return {
            organization: {
              used: usageState.usage.daily.requests,
              limit: usageState.usage.daily.requestsLimit,
              remaining: usageState.usage.daily.requestsRemaining,
            },
            visitor: {
              used: usageState.usage.visitor.dailyMessages,
              limit: usageState.limits.messagesPerVisitorPerDay,
              remaining:
                usageState.limits.messagesPerVisitorPerDay === null
                  ? null
                  : Math.max(
                      0,
                      usageState.limits.messagesPerVisitorPerDay -
                        usageState.usage.visitor.dailyMessages,
                    ),
            },
          };
        }
      } catch {
        // Fallback gracefully on timeout or usage check error
      }
      return null;
    })();

    const convPromise = (async () => {
      if (!visitorId && !conversationId) {
        return { conversation: null, messages: [] };
      }

      let activeConv = null;

      if (conversationId) {
        try {
          const candidate =
            await this.conversationRepository.findById(conversationId);
          if (
            candidate &&
            !candidate.isCompleted &&
            candidate.agentId === agent.id &&
            (!visitorId ||
              candidate.visitorId === visitorId ||
              candidate.visitorId === null)
          ) {
            activeConv = candidate;
          }
        } catch {
          // Fallback to visitor lookup
        }
      }

      if (!activeConv && visitorId) {
        const latestConv =
          await this.conversationRepository.findLatestByVisitorAndAgent(
            visitorId,
            agent.id,
          );

        if (latestConv && !latestConv.isCompleted) {
          activeConv = latestConv;
        }
      }

      if (!activeConv) {
        return { conversation: null, messages: [] };
      }

      const messages = await this.messageRepository.findByConversationId(
        activeConv.id,
      );

      return {
        conversation: {
          id: activeConv.id,
          isHandover: Boolean(activeConv.isHandover),
          isCompleted: Boolean(activeConv.isCompleted),
          isAgentTyping: activeConv.isHandover
            ? this.isAgentTyping(activeConv.id)
            : false,
        },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      };
    })();

    const [dailyRequests, convResult] = await Promise.all([
      dailyRequestsPromise,
      convPromise,
    ]);

    return {
      conversation: convResult.conversation,
      messages: convResult.messages,
      dailyRequests,
    };
  }
}
