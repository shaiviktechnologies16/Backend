import express, { Router } from "express";
import { sanitizeRequestBodyMiddleware } from "../../../common/middleware/sanitize-input.middleware.js";

export default function createTTSRoutes({
  controller,
  jobController,
  middleware = [],
}) {
  const router = Router();
  // Max 15 MB audio -> Base64 overhead ~20 MB + JSON framing -> 25 MB default limit
  const ttsBodyLimit = process.env.TTS_MAX_BODY_SIZE || "25mb";

  // 1. Authentication middleware runs first to reject unauthenticated requests early
  if (middleware.length > 0) {
    router.use(middleware);
  }

  // 2. Route-specific body parser with 25MB limit for reference audio Base64 JSON
  router.use(express.json({ limit: ttsBodyLimit }));
  router.use(express.urlencoded({ limit: ttsBodyLimit, extended: true }));

  // 3. Catch PayloadTooLargeError from body parser and return HTTP 413
  router.use((err, req, res, next) => {
    if (
      err.type === "entity.too.large" ||
      err.name === "PayloadTooLargeError" ||
      err.status === 413 ||
      err.statusCode === 413
    ) {
      return res.status(413).json({
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message:
            "Request entity too large. The reference audio upload exceeds the maximum allowed limit of 15 MB.",
        },
      });
    }
    return next(err);
  });

  // 4. Sanitize text inputs without corrupting base64 audio
  router.use(sanitizeRequestBodyMiddleware);

  router.get("/config", jobController.getEngineConfig);
  router.put("/config", jobController.updateEngineConfig);
  router.post("/config", jobController.updateEngineConfig);

  router.get("/outputs", jobController.listOutputs);

  router.get("/outputs/:filename/audio", jobController.downloadOutputAudio);

  router.delete("/outputs/:filename", jobController.deleteOutput);

  router.post("/clone", jobController.cloneVoice);

  router.post("/", controller.synthesize);

  router.post("/jobs", jobController.create);

  router.get("/jobs/:id", jobController.getById);

  router.get("/jobs/:id/audio", jobController.downloadAudio);

  router.post("/batch-jobs", jobController.createBatchJob);

  router.get("/batch-jobs/:batchId", jobController.getBatchJob);

  router.get(
    "/batch-jobs/:batchId/download-zip",
    jobController.downloadBatchZip,
  );

  return router;
}
