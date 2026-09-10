import { Router } from "express";

import { validate } from "../../../../common/middleware/validate.middleware.js";

import {
  createOrganizationInvitationSchema,
  acceptOrganizationInvitationSchema,
} from "../validators/organization-invitation.validator.js";

const createOrganizationInvitationRoutes = (
  organizationInvitationController,
  authMiddleware,
  entitlementMiddleware,
) => {
  const router = Router();

  const checkMemberLimit = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.enforceResourceLimit("TEAM_MEMBERS")(req, res, next);
  };

  router.post(
    "/",
    authMiddleware,
    checkMemberLimit,
    validate(createOrganizationInvitationSchema),
    organizationInvitationController.createInvitation,
  );

  router.get("/:token", organizationInvitationController.validateInvitation);

  router.post(
    "/:token/accept",
    validate(acceptOrganizationInvitationSchema),
    organizationInvitationController.acceptInvitation,
  );

  return router;
};

export default createOrganizationInvitationRoutes;
