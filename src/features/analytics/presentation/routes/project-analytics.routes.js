import express from "express";
import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";
import { AppError } from "../../../../common/errors/AppError.js";

export function createProjectAnalyticsRoutes({
  projectAnalyticsController,
  authMiddleware,
  workspaceContextMiddleware,
  checkProjectAccessUseCase,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
}) {
  const router = express.Router({ mergeParams: true });

  const requireProjectAccess = async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user?.id || req.context?.user?.id;

      if (!projectId) {
        throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
      }

      if (!userId) {
        throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
      }

      await checkProjectAccessUseCase.execute({
        projectId,
        userId,
      });

      next();
    } catch (err) {
      next(err);
    }
  };

  const analyticsPermission = requirePermission({
    getUserPermissionsUseCase,
    workspaceMemberPermissionRepository,
    organizationMemberRepository,
    rbacRepository,
    permission: "projects.view",
  });

  const analyticsManagePermission = requirePermission({
    getUserPermissionsUseCase,
    workspaceMemberPermissionRepository,
    organizationMemberRepository,
    rbacRepository,
    permission: "projects.update",
  });

  // Base middleware
  if (Array.isArray(workspaceContextMiddleware)) {
    router.use(...workspaceContextMiddleware);
  } else if (workspaceContextMiddleware) {
    router.use(workspaceContextMiddleware);
  } else if (authMiddleware) {
    router.use(authMiddleware);
  }

  // Ensure project authorization on every request
  router.use(requireProjectAccess);

  // Queries
  router.get("/overview", analyticsPermission, projectAnalyticsController.getOverview);
  router.get("/trends", analyticsPermission, projectAnalyticsController.getTrends);
  router.get("/pages", analyticsPermission, projectAnalyticsController.getPages);
  router.get("/landing-pages", analyticsPermission, projectAnalyticsController.getLandingPages);
  router.get("/campaigns", analyticsPermission, projectAnalyticsController.getCampaigns);
  router.get("/visitors", analyticsPermission, projectAnalyticsController.getVisitors);
  router.get("/visitors/:visitorId", analyticsPermission, projectAnalyticsController.getVisitorDetails);
  router.get("/sources", analyticsPermission, projectAnalyticsController.getSources);
  router.get("/devices", analyticsPermission, projectAnalyticsController.getDevices);
  router.get("/chatbot", analyticsPermission, projectAnalyticsController.getChatbot);

  // Tracking Configuration
  router.get("/config", analyticsPermission, projectAnalyticsController.getConfig);
  router.patch("/config", analyticsManagePermission, projectAnalyticsController.updateConfig);
  router.post("/config/rotate-key", analyticsManagePermission, projectAnalyticsController.rotateKey);

  return router;
}

