import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { Logger } from "../../../common/utils/logger.js";
import { writeEvent } from "../../../common/utils/sse.js";

import { conversationService } from "../../../container/services.js";

import { ChatRequest } from "../dto/chat.request.js";
import { ChatResponse } from "../dto/chat.response.js";
import { UpdateConversationTitleDto } from "../dto/update-conversation-title.dto.js";

import { workspaceRealtimeEmitter } from "../../../common/utils/workspace-event-emitter.js";

export const chat = asyncHandler(async (req, res) => {
  const request = ChatRequest.from(req.body);

  Logger.info("Chat request received", {
    endpoint: "/chat",
  });

  const { conversationId, reply, sources } =
    await conversationService.sendMessage(
      req.user.id,
      request.conversationId,
      request.message,
      request.agentId,
      request.projectId,
    );

  const response = ChatResponse.from({
    reply,
    conversationId,
    sources,
  });

  res.status(200).json({
    success: true,
    data: response,
  });
});

export const streamChat = asyncHandler(async (req, res) => {
  const request = ChatRequest.from(req.body);

  console.log("[ChatDebug] incoming projectId:", request.projectId);
  console.log("[ChatDebug] conversationId:", request.conversationId);
  console.log("[ChatDebug] stream started");

  Logger.info("Stream chat request received", {
    endpoint: "/chat/stream",
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  const abortController = new AbortController();

  res.on("close", () => {
    console.log("[ChatDebug] SSE connection closed");
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const stream = conversationService.streamMessage(
      req.user.id,
      request.conversationId,
      request.message,
      request.agentId,
      request.projectId,
      { signal: abortController.signal },
    );

    for await (const event of stream) {
      if (
        res.writableEnded ||
        abortController.signal.aborted ||
        res.socket?.destroyed
      ) {
        break;
      }

      if (event.type === "conversation") {
        writeEvent(res, "conversation", {
          conversationId: event.conversationId,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "sources") {
        writeEvent(res, "sources", {
          sources: event.sources,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "token") {
        console.log("[ChatDebug] AI chunk length:", event.content?.length ?? 0);
        writeEvent(res, "token", {
          content: event.content,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "usage_limit") {
        writeEvent(res, "usage_limit", {
          usage: event.usage,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "tool_call") {
        writeEvent(res, "tool_call", {
          toolName: event.toolName,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "tool_result") {
        writeEvent(res, "tool_result", {
          toolName: event.toolName,
          content: event.content,
        });
        if (res.flush) res.flush();
        continue;
      }

      if (event.type === "done") {
        console.log("[ChatDebug] AI generation completed");
        console.log("[ChatDebug] SSE complete emitted");
        writeEvent(res, "done", {});
        if (res.flush) res.flush();
      }
    }
  } catch (error) {
    if (error.name === "AbortError" || abortController.signal.aborted) {
      return;
    }

    console.log("[ChatDebug] SSE error:", error.message);

    if (!res.writableEnded) {
      writeEvent(res, "error", {
        message: error.message,
      });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversationById(
    req.user.id,
    req.params.conversationId,
  );

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

export const getConversations = asyncHandler(async (req, res) => {
  const { projectId } = req.query;

  console.log(
    "[ChatDebug] incoming projectId for getConversations:",
    projectId,
  );

  if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
    console.warn("[ChatDebug] getConversations rejected: missing projectId");
    throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
  }

  const conversations = await conversationService.getConversations(
    req.user.id,
    projectId,
  );

  res.status(200).json({
    success: true,
    data: conversations,
  });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const messages = await conversationService.getConversationMessages(
    req.user.id,
    req.params.conversationId,
  );

  res.status(200).json({
    success: true,
    data: messages,
  });
});

export const updateConversationTitle = asyncHandler(async (req, res) => {
  const request = new UpdateConversationTitleDto(req.body).validate();

  const conversation = await conversationService.updateConversationTitle(
    req.user.id,
    req.params.conversationId,
    request.title,
  );

  res.status(200).json({
    success: true,
    data: conversation,
  });
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await conversationService.deleteConversation(
    req.user.id,
    req.params.conversationId,
  );

  res.status(200).json({
    success: true,
    message: "Conversation deleted successfully.",
  });
});

export const sendAgentReply = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { message, content } = req.body;

  const createdMessage = await conversationService.sendAgentReply({
    userId: req.user.id,
    conversationId,
    content: message || content,
  });

  res.status(200).json({
    success: true,
    data: createdMessage,
  });
});

export const toggleHandover = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { isHandover } = req.body;

  await conversationService.getConversation(req.user.id, conversationId);

  const updatedConversation = await conversationService.toggleHandoverMode({
    conversationId,
    isHandover: Boolean(isHandover),
  });

  res.status(200).json({
    success: true,
    data: updatedConversation,
  });
});

export const completeConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  await conversationService.getConversation(req.user.id, conversationId);

  const updatedConversation = await conversationService.completeConversation({
    userId: req.user.id,
    conversationId,
  });

  res.status(200).json({
    success: true,
    data: updatedConversation,
  });
});

export const setAgentTyping = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { isTyping } = req.body;

  await conversationService.getConversation(req.user.id, conversationId);

  conversationService.setAgentTyping({
    conversationId,
    isTyping: Boolean(isTyping),
  });

  res.status(200).json({
    success: true,
    data: { isTyping: Boolean(isTyping) },
  });
});

export const streamWorkspaceEvents = asyncHandler(async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  res.write(": connected\n\n");
  console.log(
    `[RealtimeDebug] Workspace SSE client connected. userId=${req.user?.id}`,
  );

  // Send periodic heartbeat comment to prevent proxy/browser idle timeouts
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(": keep-alive\n\n");
    } catch {
      // Connection closed
    }
  }, 15000);

  const onMessageCreated = (event) => {
    console.log(
      "[RealtimeDebug] Broadcasting message event to Workspace SSE client:",
      {
        event: "message.created",
        conversationId: event.conversationId,
        projectId: event.projectId,
        messageId: event.message?.id,
        role: event.message?.role,
      },
    );
    writeEvent(res, "message.created", event);
  };

  workspaceRealtimeEmitter.on("conversation.message.created", onMessageCreated);

  res.on("close", () => {
    clearInterval(heartbeatInterval);
    console.log(
      `[RealtimeDebug] Workspace SSE client disconnected. userId=${req.user?.id}`,
    );
    workspaceRealtimeEmitter.off(
      "conversation.message.created",
      onMessageCreated,
    );
  });
});
