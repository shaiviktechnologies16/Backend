import { Router } from "express";

export const createOrganizationEnquiriesRoutes = ({
  getOrganizationEnquiriesController,
  updateLeadStatusController,
}) => {
  const router = Router();

  router.get(
    "/:organizationId/enquiries",
    getOrganizationEnquiriesController.get,
  );

  router.patch(
    "/:organizationId/enquiries/:leadId/status",
    updateLeadStatusController.updateStatus,
  );

  router.patch(
    "/:organizationId/enquiries/:leadId",
    updateLeadStatusController.updateStatus,
  );

  return router;
};
