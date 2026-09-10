import { Router } from "express";

import { authenticate } from "../../../../common/middleware/auth.middleware.js";
import { requirePermission } from "../middleware/require-permission.middleware.js";

export default function createAdminRoutes(
  adminController,
  userRepository,
  getUserPermissionsUseCase,
  jwtService,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
) {
  const router = Router();

  const authMiddleware = authenticate(userRepository, jwtService);

  router.get(
    "/dashboard",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "dashboard.view",
    }),
    adminController.getDashboard,
  );

  router.get(
    "/users",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "users.view",
    }),
    adminController.getUsers,
  );

  router.get(
    "/users/:id",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "users.view",
    }),
    adminController.getUserById,
  );

  router.patch(
    "/users/:id/role",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "users.update",
    }),
    adminController.updateUserRole,
  );

  router.delete(
    "/users/:id",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "users.delete",
    }),
    adminController.deleteUser,
  );

  router.get(
    "/admins",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "admins.manage",
    }),
    adminController.getAdmins,
  );

  router.post(
    "/admins",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "admins.manage",
    }),
    adminController.createAdmin,
  );

  router.patch(
    "/admins/:id/status",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "admins.manage",
    }),
    adminController.updateAdminStatus,
  );

  router.patch(
    "/admins/:id/permissions",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "admins.manage",
    }),
    adminController.updateAdminPermissions,
  );

  router.delete(
    "/admins/:id",
    authMiddleware,
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "admins.manage",
    }),
    adminController.deleteAdmin,
  );

  return router;
}
