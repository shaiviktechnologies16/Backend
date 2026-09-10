import { Router } from "express";

export function createWorkspaceSettingsRoutes({
  workspaceSettingsController,
  middleware,
}) {
  const router = Router();

  router.get("/", ...middleware, workspaceSettingsController.get);

  router.put("/", ...middleware, workspaceSettingsController.update);

  return router;
}
