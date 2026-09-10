import express from "express";

export function createAISettingsRoutes({ aiSettingsController, middleware }) {
  const router = express.Router();

  router.use(middleware);

  router.get("/:organizationId/ai-settings", aiSettingsController.get);

  router.patch("/:organizationId/ai-settings", aiSettingsController.update);

  return router;
}
