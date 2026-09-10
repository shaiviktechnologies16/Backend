import { Router } from "express";

import {
  addMemberValidator,
  updateMemberRoleValidator,
} from "../validators/organization-member.validator.js";

const createOrganizationMemberRoutes = (
  organizationMemberController,
  authMiddleware,
  entitlementMiddleware,
) => {
  const router = Router();

  const checkMemberLimit = (req, res, next) => {
    if (!entitlementMiddleware) return next();
    entitlementMiddleware.enforceResourceLimit("TEAM_MEMBERS")(req, res, next);
  };

  router.get("/", authMiddleware, organizationMemberController.getMembers);

  router.post(
    "/",
    authMiddleware,
    checkMemberLimit,
    addMemberValidator,
    organizationMemberController.addMember,
  );

  router.patch(
    "/:userId/role",
    authMiddleware,
    updateMemberRoleValidator,
    organizationMemberController.updateMemberRole,
  );

  router.get(
    "/:userId/permissions",
    authMiddleware,
    organizationMemberController.getMemberPermissions,
  );

  router.patch(
    "/:userId/permissions",
    authMiddleware,
    organizationMemberController.updateMemberPermissions,
  );

  router.delete(
    "/:userId",
    authMiddleware,
    organizationMemberController.removeMember,
  );

  router.get(
    "/enquiry-notification-recipients",
    authMiddleware,
    organizationMemberController.getEnquiryNotificationRecipients,
  );

  router.patch(
    "/enquiry-notification-recipients",
    authMiddleware,
    organizationMemberController.updateEnquiryNotificationRecipients,
  );
  return router;
};

export default createOrganizationMemberRoutes;
