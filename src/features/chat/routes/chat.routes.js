import { Router } from "express";

import {
  chat,
  streamChat,
  getConversation,
  getConversations,
  getConversationMessages,
  updateConversationTitle,
  deleteConversation,
} from "../controller/chat.controller.js";

export default function createChatRoutes({ middleware }) {
  const router = Router();

  router.use(middleware);

  router.post("/", chat);
  router.post("/stream", streamChat);

  router.get("/conversations", getConversations);
  router.get("/conversations/:conversationId", getConversation);
  router.get(
    "/conversations/:conversationId/messages",
    getConversationMessages,
  );

  router.patch("/conversations/:conversationId/title", updateConversationTitle);

  router.delete("/conversations/:conversationId", deleteConversation);

  return router;
}
