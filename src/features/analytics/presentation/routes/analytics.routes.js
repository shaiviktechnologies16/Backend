import express from "express";

import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";

const createAnalyticsRoutes = ({
  analyticsController,
  authMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
}) => {
  const router = express.Router();

  router.use(authMiddleware);

  const analyticsPermission = requirePermission({
    getUserPermissionsUseCase,
    workspaceMemberPermissionRepository,
    organizationMemberRepository,
    rbacRepository,
    permission: "analytics.view",
  });

  router.get("/overview", analyticsPermission, analyticsController.getOverview);

  router.get("/trends", analyticsPermission, analyticsController.getTrends);

  router.get("/agents", analyticsPermission, analyticsController.getAgents);

  router.get("/projects", analyticsPermission, analyticsController.getProjects);

  return router;
};

export default createAnalyticsRoutes;
