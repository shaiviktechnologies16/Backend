import { Router } from "express";

import {
  chat,
  streamChat,
  getConversation,
  getConversations,
  getConversationMessages,
  updateConversationTitle,
  deleteConversation,
  sendAgentReply,
  toggleHandover,
  completeConversation,
  setAgentTyping,
  streamWorkspaceEvents,
} from "../controller/chat.controller.js";

export default function createChatRoutes({ middleware }) {
  const router = Router();

  router.use(middleware);

  router.post("/", chat);
  router.post("/stream", streamChat);
  router.get("/stream/events", streamWorkspaceEvents);

  router.get("/conversations", getConversations);
  router.get("/conversations/:conversationId", getConversation);
  router.get(
    "/conversations/:conversationId/messages",
    getConversationMessages,
  );

  router.post("/conversations/:conversationId/reply", sendAgentReply);
  router.post("/conversations/:conversationId/typing", setAgentTyping);
  router.patch("/conversations/:conversationId/handover", toggleHandover);
  router.post("/conversations/:conversationId/complete", completeConversation);

  router.patch("/conversations/:conversationId/title", updateConversationTitle);

  router.delete("/conversations/:conversationId", deleteConversation);

  return router;
}
