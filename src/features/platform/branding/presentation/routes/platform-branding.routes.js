import express from "express";

export default function createPlatformBrandingRoutes({
  controller,
  middleware,
}) {
  const router = express.Router();

  router.patch("/", ...middleware, controller.update.bind(controller));

  return router;
}
