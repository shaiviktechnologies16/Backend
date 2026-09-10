import express from "express";

export function createOrganizationModelAccessRoutes({
  organizationModelAccessController,
  middleware,
}) {
  const router = express.Router();

  router.use(middleware);

  router.post("/", organizationModelAccessController.add);

  router.get("/:organizationId", organizationModelAccessController.getAll);

  router.delete(
    "/:organizationId/:aiModelId",
    organizationModelAccessController.remove,
  );

  return router;
}
