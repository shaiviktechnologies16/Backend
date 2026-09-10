import express from "express";

import { validate } from "../../../../common/middleware/validate.middleware.js";

import {
  createWhatsappConnectionSchema,
  updateWhatsappConnectionSchema,
} from "../validators/whatsapp-connection.validator.js";

import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";

import { requireOrganizationFeature } from "../../../platform/organization-feature-access/presentation/middleware/require-organization-feature.middleware.js";

export default function createWhatsappConnectionRoutes(
  whatsappConnectionController,
  authMiddleware,
  workspaceContextMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
  organizationFeatureAccessRepository,
  entitlementMiddleware,
) {
  const router = express.Router();

  router.post(
    "/webhook/evolution",
    whatsappConnectionController.evolutionWebhook,
  );

  router.use(authMiddleware);

  router.use(workspaceContextMiddleware);

  router.use(
    requireOrganizationFeature({
      organizationFeatureAccessRepository,
      feature: "WHATSAPP",
    }),
  );

  const checkEntitlements = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.requireFeature("WHATSAPP")(req, res, (err) => {
      if (err) return next(err);
      entitlementMiddleware.enforceResourceLimit("WHATSAPP_CONNECTIONS")(
        req,
        res,
        next,
      );
    });
  };

  router.post(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.create",
    }),
    checkEntitlements,
    validate(createWhatsappConnectionSchema),
    whatsappConnectionController.create,
  );

  router.get(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.view",
    }),
    whatsappConnectionController.getAll,
  );

  router.post(
    "/:id/connect",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.update",
    }),
    whatsappConnectionController.connect,
  );

  router.get(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.view",
    }),
    whatsappConnectionController.getById,
  );

  router.patch(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.update",
    }),
    validate(updateWhatsappConnectionSchema),
    whatsappConnectionController.update,
  );

  router.delete(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "whatsapp_connections.delete",
    }),
    whatsappConnectionController.delete,
  );

  return router;
}
