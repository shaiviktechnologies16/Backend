import express from "express";
import { validate } from "../../../../common/middleware/validate.middleware.js";
import {
  createAgentSchema,
  updateAgentSchema,
} from "../validators/agent.validator.js";
import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";

export default function createAgentRoutes(
  agentController,
  authMiddleware,
  workspaceContextMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
  entitlementMiddleware,
) {
  const router = express.Router();

  router.use(workspaceContextMiddleware);

  const checkEntitlements = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.requireFeature("AI_AGENTS")(req, res, (err) => {
      if (err) return next(err);
      entitlementMiddleware.enforceResourceLimit("AI_AGENTS")(req, res, next);
    });
  };

  router.post(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.create",
    }),
    checkEntitlements,
    validate(createAgentSchema),
    agentController.createAgent,
  );

  router.get(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.view",
    }),
    agentController.getAgentsByProject,
  );

  router.get(
    "/workspace",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.view",
    }),
    agentController.getAgentsByOrganization,
  );

  router.get(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.view",
    }),
    agentController.getAgentById,
  );

  router.patch(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.update",
    }),
    validate(updateAgentSchema),
    agentController.updateAgent,
  );

  router.delete(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.delete",
    }),
    agentController.deleteAgent,
  );

  router.patch(
    "/:id/default",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.update",
    }),
    agentController.setDefaultAgent,
  );

  router.post(
    "/:id/public/enable",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.update",
    }),
    agentController.enablePublic,
  );

  router.post(
    "/:id/public/disable",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.update",
    }),
    agentController.disablePublic,
  );

  router.post(
    "/:id/public/regenerate",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "agents.update",
    }),
    agentController.regeneratePublicKey,
  );
  return router;
}
