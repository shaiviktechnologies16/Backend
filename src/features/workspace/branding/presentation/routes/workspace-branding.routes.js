import { Router } from "express";

export default function createWorkspaceBrandingRoutes({
  controller,
  authMiddleware,
  workspaceContextMiddleware,
}) {
  const router = Router();

  router.get("/", authMiddleware, workspaceContextMiddleware, controller.get);

  return router;
}
