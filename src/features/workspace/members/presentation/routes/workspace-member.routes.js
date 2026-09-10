import { Router } from "express";
import { requireWorkspacePermission } from "../middleware/require-workspace-permission.middleware.js";

export function createWorkspaceMemberRoutes({
  workspaceMemberController,
  middleware,
  entitlementMiddleware,
}) {
  const router = Router();

  const checkMemberLimit = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.enforceResourceLimit("TEAM_MEMBERS")(req, res, next);
  };

  router.get(
    "/",
    ...middleware,
    requireWorkspacePermission("members.view"),
    workspaceMemberController.getMembers,
  );

  router.post(
    "/invite",
    ...middleware,
    requireWorkspacePermission("members.manage"),
    checkMemberLimit,
    workspaceMemberController.invite,
  );

  router.put(
    "/:id/role",
    ...middleware,
    requireWorkspacePermission("members.manage"),
    workspaceMemberController.updateRole,
  );

  router.patch(
    "/:id/status",
    ...middleware,
    requireWorkspacePermission("members.manage"),
    workspaceMemberController.updateStatus,
  );

  router.delete(
    "/:id",
    ...middleware,
    requireWorkspacePermission("members.manage"),
    workspaceMemberController.remove,
  );

  router.put(
    "/:id/restore",
    ...middleware,
    requireWorkspacePermission("members.manage"),
    workspaceMemberController.restore,
  );

  return router;
}
