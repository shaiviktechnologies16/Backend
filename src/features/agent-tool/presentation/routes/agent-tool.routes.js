import { Router } from "express";

export default function createAgentToolRoutes(controller, authMiddleware) {
  const router = Router();

  router.use(authMiddleware);

  router.post("/agents/:agentId/tools", controller.create);

  router.get("/agents/:agentId/tools", controller.getAll);

  router.patch("/tools/:toolId", controller.update);

  router.delete("/tools/:toolId", controller.delete);

  return router;
}
