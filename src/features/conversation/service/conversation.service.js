import { Conversation } from "../entity/conversation.entity.js";
import { Message } from "../../message/entity/message.entity.js";
import { Usage } from "../../usage/entity/usage.entity.js";
import { MessageRole } from "../../../common/constants/message-role.js";
import { executeTransaction } from "../../../database/transaction.js";
import { AppError } from "../../../common/errors/AppError.js";
import { isSimpleConversationalMessage } from "../service/message-intent.service.js";
import {
  sanitizeUserPromptInput,
  appendSecurityGuardrailsToSystemPrompt,
} from "../../../common/utils/prompt-guard.util.js";

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
  }

  async validateAgentModelAccess(agent) {
    const orgId = agent?.project?.organizationId;
    if (!orgId) return;

    if (this.organizationModelEntitlementService) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId: orgId,
          },
        );
      } catch (err) {
        console.error(
          "Failed to auto-sync entitlements during model validation:",
          err,
        );
      }
    }

    if (this.organizationModelAccessRepository && agent?.aiModelId) {
      const access = await this.organizationModelAccessRepository.findOne(
        orgId,
        agent.aiModelId,
      );
      if (!access || access.aiModel?.status !== "ACTIVE") {
        throw new AppError(
          "AI model is not authorized for your organization's subscription plan.",
          403,
          "MODEL_ACCESS_DENIED",
        );
      }
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

  async buildRagSystemMessage({ context, projectId, query, isPublic = false }) {
    const systemMessage = this.aiContextService.buildSystemMessage(context);

    const knowledgeResults = await this.knowledgeSearchService.search({
      projectId,
      query,
    });

    const ragSystemPrompt = await this.getPlatformConfigUseCase.getValue(
      "AI_RAG_SYSTEM_PROMPT",
    );

    const noContextMessage = await this.getPlatformConfigUseCase.getValue(
      "AI_RAG_NO_CONTEXT_MESSAGE",
    );

    const knowledgeContext = knowledgeResults
      .map((result, index) => {
        return `[Knowledge ${index + 1}]
${result.content}`;
      })
      .join("\n\n");

    const baseSystemPromptContent = `${systemMessage.content}

${ragSystemPrompt}

Knowledge Context:
${knowledgeContext || noContextMessage}`;

    const guardedSystemPromptContent = appendSecurityGuardrailsToSystemPrompt(
      baseSystemPromptContent,
    );

    return {
      message: {
        role: MessageRole.SYSTEM,
        content: guardedSystemPromptContent,
      },
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
    });

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider,
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
      projectId: conversation.projectId,
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
    });

    logStage("conversation_setup", setupStartedAt);

    const providerStartedAt = Date.now();

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider,
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

    const promptBuildStartedAt = Date.now();
    const contextStartedAt = Date.now();

    const context = await this.aiContextService.build({
      userId,
      agentId: agent.id,
      conversation,
    });

    logStage("ai_context", contextStartedAt);

    let ragSources = [];
    let tools = [];
    let ragMs = 0;

    if (isSimpleMessage) {
      messages.unshift(this.aiContextService.buildSystemMessage(context));

      console.log("[CHAT INTENT]", {
        intent,
        ragEnabled: false,
        toolCount: 0,
      });
    } else {
      const ragStartedAt = Date.now();

      const ragResult = await this.buildRagSystemMessage({
        context,
        projectId: conversation.projectId,
        query: content,
      });

      ragMs = Date.now() - ragStartedAt;
      logStage("rag", ragStartedAt);

      messages.unshift(ragResult.message);
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

    while (toolIterations < maxToolIterations) {
      let toolCalls = [];
      let streamedText = "";

      const ollamaStartedAt = Date.now();

      for await (const event of aiProvider.stream(currentMessages, {
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools,
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

      await this.usageRepository.create(
        new Usage({
          agentId: agent.id,
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          responseTimeMs: Date.now() - startedAt,
          status: "SUCCESS",
        }),
        manager,
      );

      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.create(assistantMessage, manager);
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
      });

      if (conversationId) {
        conversation = await this.conversationRepository.findById(
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

      const userMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content,
      });

      await this.messageRepository.create(userMessage, manager);
    });

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider,
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
      projectId: conversation.projectId,
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

      for (const toolCall of toolCalls) {
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

    await executeTransaction(async (queryRunner) => {
      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.createForStreaming(
        assistantMessage,
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

    /*
     * Agent resolution
     */

    const agentStartedAt = Date.now();

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

    await this.validateAgentModelAccess(agent);

    const agentResolutionMs = Date.now() - agentStartedAt;

    logStage("agent_resolution", agentStartedAt);

    /*
     * Plan validation
     *
     * Deliberately outside the conversation transaction.
     */

    const planStartedAt = Date.now();

    planUsage = await this.checkPlanUsageUseCase.execute({
      organizationId: agent.project.organizationId,
      visitorId,
    });

    const planUsageMs = Date.now() - planStartedAt;

    logStage("plan_usage", planStartedAt);

    /*
     * Conversation setup
     *
     * Transaction contains only database writes
     * and conversation ownership validation.
     */

    const conversationSetupStartedAt = Date.now();

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      if (conversationId) {
        conversation = await this.conversationRepository.findById(
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
      } else {
        conversation = new Conversation({
          userId: null,
          visitorId,
          projectId: agent.projectId,
          agentId: agent.id,
          title: "New Conversation",
        });

        conversation = await this.conversationRepository.createForStreaming(
          conversation,
          manager,
        );
      }

      const userMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content,
      });

      await this.messageRepository.create(userMessage, manager);
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

    const aiProvider = this.aiProviderFactory.getProviderByName(
      agent.aiModel?.provider,
    );

    if (!aiProvider) {
      throw new AppError(
        `AI provider "${agent.aiModel?.provider}" is not configured.`,
        500,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    const providerResolutionMs = Date.now() - providerStartedAt;

    /*
     * History
     */

    const historyStartedAt = Date.now();

    const history = await this.messageRepository.findRecentByConversationId(
      conversation.id,
      aiProvider.maxContextMessages,
    );

    const historyMs = Date.now() - historyStartedAt;

    logStage("history", historyStartedAt);

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    /*
     * AI context
     */

    const contextStartedAt = Date.now();

    const context = await this.aiContextService.buildPublic({
      agent,
      project: agent.project,
      conversation,
    });

    const contextMs = Date.now() - contextStartedAt;

    logStage("ai_context", contextStartedAt);

    /*
     * RAG / tools
     */

    const promptBuildStartedAt = Date.now();

    let ragSources = [];
    let ragMs = 0;
    let tools = [];

    if (isSimpleMessage) {
      const systemMessage = this.aiContextService.buildSystemMessage(context, {
        lightweight: true,
      });

      messages.unshift(systemMessage);
    } else {
      const ragStartedAt = Date.now();

      const ragResult = await this.buildRagSystemMessage({
        context,
        projectId: conversation.projectId,
        query: content,
        isPublic: true,
      });

      ragMs = Date.now() - ragStartedAt;

      logStage("rag", ragStartedAt);

      messages.unshift(ragResult.message);
      ragSources = ragResult.sources;

      const toolsStartedAt = Date.now();

      tools = await this.agentToolRepository.findByAgentId(agent.id);

      tools = this.agentToolSchemaService.toOllamaTools(tools);

      logStage("agent_tools", toolsStartedAt);
    }

    const promptBuildMs = Date.now() - promptBuildStartedAt;

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
      type: "conversation",
      conversationId: conversation.id,
    };

    yield {
      type: "sources",
      sources: ragSources,
    };

    while (toolIterations < maxToolIterations) {
      let toolCalls = [];
      let streamedText = "";

      const ollamaStartedAt = Date.now();

      for await (const event of aiProvider.stream(currentMessages, {
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        tools,
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
        }
      }

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

    /*
     * Persistence
     */

    const persistenceStartedAt = Date.now();

    await executeTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;

      await this.usageRepository.create(
        new Usage({
          agentId: agent.id,
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          responseTimeMs: Date.now() - startedAt,
          status: "SUCCESS",
        }),
        manager,
      );

      const assistantMessage = new Message({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });

      await this.messageRepository.create(assistantMessage, manager);
    });

    const persistenceMs = Date.now() - persistenceStartedAt;

    logStage("persistence", persistenceStartedAt);

    const dailyOrganizationLimit = planUsage.limits.requestsPerDay;

    const dailyOrganizationUsed = planUsage.usage.daily.requests + 1;

    const dailyOrganizationRemaining =
      dailyOrganizationLimit !== null
        ? Math.max(dailyOrganizationLimit - dailyOrganizationUsed, 0)
        : null;

    const dailyVisitorLimit = planUsage.limits.messagesPerVisitorPerDay;

    const dailyVisitorUsed = planUsage.usage.visitor.dailyMessages + 1;

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
}
