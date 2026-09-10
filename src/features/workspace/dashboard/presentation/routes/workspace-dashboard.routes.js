import { Router } from "express";

export function createWorkspaceDashboardRoutes({
  workspaceDashboardController,
  middleware,
}) {
  const router = Router();

  router.get("/", middleware, workspaceDashboardController.getDashboard);

  return router;
}
