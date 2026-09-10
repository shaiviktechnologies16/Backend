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

  return router;
}
