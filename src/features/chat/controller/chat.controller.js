import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { Logger } from "../../../common/utils/logger.js";
import { writeEvent } from "../../../common/utils/sse.js";

import { conversationService } from "../../../container/services.js";

import { ChatRequest } from "../dto/chat.request.js";
import { ChatResponse } from "../dto/chat.response.js";
import { UpdateConversationTitleDto } from "../dto/update-conversation-title.dto.js";

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

  Logger.info("Stream chat request received", {
    endpoint: "/chat/stream",
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  try {
    const stream = conversationService.streamMessage(
      req.user.id,
      request.conversationId,
      request.message,
      request.agentId,
      request.projectId,
    );

    for await (const event of stream) {
      if (event.type === "conversation") {
        writeEvent(res, "conversation", {
          conversationId: event.conversationId,
        });
        continue;
      }

      if (event.type === "sources") {
        writeEvent(res, "sources", {
          sources: event.sources,
        });
        continue;
      }

      if (event.type === "token") {
        writeEvent(res, "token", {
          content: event.content,
        });
        continue;
      }

      if (event.type === "usage_limit") {
        writeEvent(res, "usage_limit", {
          usage: event.usage,
        });

        continue;
      }

      if (event.type === "tool_call") {
        writeEvent(res, "tool_call", {
          toolName: event.toolName,
        });
        continue;
      }

      if (event.type === "tool_result") {
        writeEvent(res, "tool_result", {
          toolName: event.toolName,
          content: event.content,
        });
        continue;
      }

      if (event.type === "done") {
        writeEvent(res, "done", {});
      }
    }
  } catch (error) {
    writeEvent(res, "error", {
      message: error.message,
    });
  } finally {
    res.end();
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
