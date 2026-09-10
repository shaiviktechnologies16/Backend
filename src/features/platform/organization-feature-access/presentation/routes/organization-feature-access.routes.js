import { Router } from "express";

export const createOrganizationFeatureAccessRoutes = ({
  organizationFeatureAccessController,
}) => {
  const router = Router();

  router.get(
    "/organizations/:organizationId/features",
    organizationFeatureAccessController.get.bind(
      organizationFeatureAccessController,
    ),
  );

  router.put(
    "/organizations/:organizationId/features",
    organizationFeatureAccessController.update.bind(
      organizationFeatureAccessController,
    ),
  );

  return router;
};
