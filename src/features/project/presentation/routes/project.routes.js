import express from "express";

import { validate } from "../../../../common/middleware/validate.middleware.js";
import { createProjectSchema } from "../validators/project.validator.js";
import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";

export default function createProjectRoutes(
  projectController,
  workspaceContextMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
  entitlementMiddleware,
) {
  const router = express.Router();

  router.use(...workspaceContextMiddleware);

  const checkEntitlements = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.enforceResourceLimit("PROJECTS")(req, res, next);
  };

  router.post(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.create",
    }),
    checkEntitlements,
    validate(createProjectSchema),
    projectController.createProject,
  );

  router.get(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.view",
    }),
    projectController.getProjects,
  );

  router.get(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.view",
    }),
    projectController.getProject,
  );

  router.patch(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.update",
    }),
    projectController.updateProject,
  );

  router.delete(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.delete",
    }),
    projectController.deleteProject,
  );

  router.patch(
    "/:id/default",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.update",
    }),
    projectController.setDefaultProject,
  );

  router.get(
    "/default",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "projects.view",
    }),
    projectController.getDefaultProject,
  );

  return router;
}
