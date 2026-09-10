import { Router } from "express";

export function createWorkspaceApiKeyRoutes({
  workspaceApiKeyController,
  middleware,
}) {
  const router = Router();

  router.get("/", ...middleware, workspaceApiKeyController.getAll);

  router.post("/", ...middleware, workspaceApiKeyController.create);

  router.patch("/:apiKeyId", ...middleware, workspaceApiKeyController.update);

  router.delete("/:apiKeyId", ...middleware, workspaceApiKeyController.delete);

  return router;
}
