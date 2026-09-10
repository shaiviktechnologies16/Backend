import express from "express";

export function createWorkspaceFeatureAccessRoutes({
  workspaceFeatureAccessController,
  authMiddleware,
  organizationContextMiddleware,
}) {
  const router = express.Router();

  router.use(authMiddleware);
  router.use(organizationContextMiddleware);

  router.get("/", workspaceFeatureAccessController.getFeatures);

  return router;
}
