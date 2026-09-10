import { Router } from "express";

export function createPlatformConfigRoutes({
  platformConfigController,
  middleware = [],
}) {
  const router = Router();

  router.get("/", ...middleware, platformConfigController.getAll);

  router.post("/", ...middleware, platformConfigController.create);

  router.patch("/:configKey", ...middleware, platformConfigController.update);

  return router;
}
