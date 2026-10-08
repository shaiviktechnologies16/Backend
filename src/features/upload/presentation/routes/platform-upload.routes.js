import express from "express";
import { uploadSingleFile } from "../middleware/upload.middleware.js";

export default function createPlatformUploadRoutes({
  uploadController,
  middleware,
}) {
  const router = express.Router();

  router.get("/", ...middleware, uploadController.listByPurpose);

  router.post("/", ...middleware, uploadSingleFile, uploadController.upload);

  return router;
}
