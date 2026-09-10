import express from "express";

export default function createPublicConfigRoutes({
  publicConfigController,
}) {
  const router = express.Router();

  router.get(
    "/",
    publicConfigController.get.bind(publicConfigController),
  );

  return router;
}
