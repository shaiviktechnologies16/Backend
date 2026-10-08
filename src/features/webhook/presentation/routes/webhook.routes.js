import { Router } from "express";

export default function createWebhookRoutes({ controller, authenticateJwt }) {
  const router = Router();

  if (authenticateJwt) {
    router.use(authenticateJwt);
  }

  router.post("/", controller.createWebhook);
  router.get("/", controller.getWebhooks);
  router.delete("/:id", controller.deleteWebhook);
  router.post("/:id/test", controller.testPing);

  return router;
}
