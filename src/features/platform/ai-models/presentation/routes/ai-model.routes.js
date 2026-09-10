import express from "express";

import { validate } from "../../../../../common/middleware/validate.middleware.js";

import {
  createAIModelSchema,
  updateAIModelSchema,
} from "../validators/ai-model.validator.js";

export function createAIModelRoutes({ aiModelController, middleware }) {
  const router = express.Router();

  router.use(...middleware);

  router.post("/", validate(createAIModelSchema), aiModelController.create);

  router.get("/", aiModelController.getAll);

  router.get("/:id", aiModelController.getById);

  router.put("/:id", validate(updateAIModelSchema), aiModelController.update);

  router.patch("/:id/status", aiModelController.updateStatus);

  return router;
}
