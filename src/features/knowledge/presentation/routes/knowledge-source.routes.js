import express from "express";
import { validate } from "../../../../common/middleware/validate.middleware.js";

import {
  createKnowledgeSourceSchema,
  updateKnowledgeSourceSchema,
} from "../validators/knowledge-source.validator.js";

import { requirePermission } from "../../../admin/presentation/middleware/require-permission.middleware.js";

export default function createKnowledgeSourceRoutes(
  knowledgeSourceController,
  authMiddleware,
  workspaceContextMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
  entitlementMiddleware,
) {
  const router = express.Router({ mergeParams: true });

  router.use(workspaceContextMiddleware);

  const checkEntitlements = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.requireFeature("KNOWLEDGE_BASE")(req, res, (err) => {
      if (err) return next(err);
      entitlementMiddleware.enforceResourceLimit("KNOWLEDGE_BASES")(
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
      permission: "knowledge.create",
    }),
    checkEntitlements,
    validate(createKnowledgeSourceSchema),
    knowledgeSourceController.createKnowledgeSource,
  );

  router.get(
    "/",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.view",
    }),
    knowledgeSourceController.getKnowledgeSources,
  );

  router.post(
    "/:id/ingest",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.update",
    }),
    knowledgeSourceController.ingestKnowledgeSource,
  );

  router.post(
    "/search",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.view",
    }),
    knowledgeSourceController.searchKnowledge,
  );

  router.get(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.view",
    }),
    knowledgeSourceController.getKnowledgeSource,
  );

  router.patch(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.update",
    }),
    validate(updateKnowledgeSourceSchema),
    knowledgeSourceController.updateKnowledgeSource,
  );

  router.delete(
    "/:id",
    requirePermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
      permission: "knowledge.delete",
    }),
    knowledgeSourceController.deleteKnowledgeSource,
  );

  return router;
}
