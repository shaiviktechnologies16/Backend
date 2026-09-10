import { Router } from "express";

export function createPlatformApiKeyRoutes({
  platformApiKeyController,
  middleware,
}) {
  const router = Router();

  router.get("/", ...middleware, platformApiKeyController.getAll);

  router.post("/", ...middleware, platformApiKeyController.create);

  router.put("/:id", ...middleware, platformApiKeyController.update);

  router.delete("/:id", ...middleware, platformApiKeyController.delete);

  return router;
}
