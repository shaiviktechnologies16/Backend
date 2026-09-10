import { Router } from "express";

import {
  createPlanValidator,
  updatePlanValidator,
  updateUsageLimitValidator,
} from "../validators/plan.validator.js";

export function createPlanRoutes({ planController, middleware = [] }) {
  const router = Router();

  router.get("/public", planController.getPlans);

  // Organization-specific routes MUST come before parameterized /:id routes
  router.get(
    "/organizations/:organizationId/subscription",
    planController.getSubscription,
  );

  router.post(
    "/organizations/:organizationId/subscription/change",
    planController.changeSubscription,
  );

  router.post(
    "/organizations/:organizationId/subscription/dev/reset",
    planController.resetSubscriptionDev,
  );

  router.get(
    "/organizations/:organizationId/invoices",
    planController.getInvoices,
  );

  router.get(
    "/organizations/:organizationId/invoices/:invoiceId/download",
    planController.downloadInvoice,
  );

  router.post(
    "/organizations/:organizationId/invoices/:invoiceId/resend-whatsapp",
    planController.resendInvoiceWhatsapp,
  );

  router.patch(
    "/organizations/:organizationId/plan",
    ...middleware,
    planController.assignPlanToOrganization,
  );

  // Root and generic ID routes
  router.get("/", ...middleware, planController.getPlans);

  router.post(
    "/",
    ...middleware,
    createPlanValidator,
    planController.createPlan,
  );

  router.patch(
    "/:id/usage-limit",
    ...middleware,
    updateUsageLimitValidator,
    planController.updateUsageLimit,
  );

  router.get("/:id", ...middleware, planController.getPlan);

  router.patch(
    "/:id",
    ...middleware,
    updatePlanValidator,
    planController.updatePlan,
  );

  router.delete("/:id", ...middleware, planController.deletePlan);

  return router;
}
