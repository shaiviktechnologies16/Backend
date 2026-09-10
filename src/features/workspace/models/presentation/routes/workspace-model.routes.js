import express from "express";

export function createWorkspaceModelRoutes({
  workspaceModelController,
  middleware,
}) {
  const router = express.Router();

  router.use(middleware);

  router.get("/", workspaceModelController.getAll);

  return router;
}
