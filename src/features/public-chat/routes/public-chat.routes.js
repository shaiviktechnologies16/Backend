import { Router } from "express";

import { visitorMiddleware } from "../middleware/visitor.middleware.js";

export default function createPublicChatRoutes({ controller }) {
  const router = Router();

  router.use(visitorMiddleware);

  router.post("/:publicKey", controller.publicChat);

  router.post("/:publicKey/stream", controller.streamPublicChat);

  router.get("/:publicKey/config", controller.getPublicAgentConfig);

  router.get(
    "/agent/:agentId/config",
    controller.getPublicAgentConfigByAgentId,
  );

  router.get(
    "/:publicKey/active-conversation",
    controller.getPublicActiveConversation,
  );

  router.get(
    "/:publicKey/conversations/:conversationId/messages",
    controller.getPublicConversationMessages,
  );

  return router;
}
