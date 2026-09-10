import { Router } from "express";

import {
  createOrganizationValidator,
  updateOrganizationValidator,
} from "../validators/organization.validator.js";

import { organizationKeyMiddleware } from "../../../../common/middleware/organization-api-key.middleware.js";

import { uploadSingleFile } from "../../../upload/presentation/middleware/upload.middleware.js";

const createOrganizationRoutes = (organizationController, authMiddleware) => {
  const router = Router();

  router.get("/", authMiddleware, organizationController.getOrganizations);

  router.get(
    "/public/:organizationId",
    organizationKeyMiddleware,
    organizationController.getPublicOrganization,
  );

  router.get(
    "/:id",
    authMiddleware,
    organizationController.getOrganizationById,
  );

  router.get(
    "/:id/projects",
    authMiddleware,
    organizationController.getOrganizationProjects,
  );

  router.post(
    "/",
    authMiddleware,
    createOrganizationValidator,
    organizationController.createOrganization,
  );

  router.patch(
    "/:id",
    authMiddleware,
    updateOrganizationValidator,
    organizationController.updateOrganization,
  );

  router.patch(
    "/:organizationId/logo",
    authMiddleware,
    uploadSingleFile,
    organizationController.updateLogo,
  );

  router.delete(
    "/:id",
    authMiddleware,
    organizationController.deleteOrganization,
  );

  return router;
};

export default createOrganizationRoutes;
