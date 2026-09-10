import express from "express";

import { validate } from "../../../../common/middleware/validate.middleware.js";

import {
  createPlatformWhatsappConnectionSchema,
  updatePlatformWhatsappConnectionSchema,
} from "../validators/platform-whatsapp-connection.validator.js";

export default function createPlatformWhatsappRoutes({
  controller,
  middleware = [],
}) {
  const router = express.Router();

  router.use(...middleware);

  router.post(
    "/",
    validate(createPlatformWhatsappConnectionSchema),
    controller.create,
  );

  router.get("/", controller.getAll);

  router.get("/:id", controller.getById);

  router.post("/:id/connect", controller.connect);

  router.patch(
    "/:id",
    validate(updatePlatformWhatsappConnectionSchema),
    controller.update,
  );

  router.delete("/:id", controller.delete);

  return router;
}
