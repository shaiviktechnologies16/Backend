import express, { Router } from "express";
import { sanitizeRequestBodyMiddleware } from "../../../common/middleware/sanitize-input.middleware.js";

export function createPublicTTSRoutes({ publicTtsController }) {
  const router = Router();

  // Route-specific body parser for public TTS:
  // Allows up to 15 MB audio file encoded as Base64 (~20 MB) plus JSON envelope (~25 MB total limit)
  const publicTtsBodyLimit =
    process.env.PUBLIC_TTS_MAX_BODY_SIZE ||
    process.env.TTS_MAX_BODY_SIZE ||
    "25mb";

  router.use(express.json({ limit: publicTtsBodyLimit }));
  router.use(express.urlencoded({ limit: publicTtsBodyLimit, extended: true }));

  // Catch PayloadTooLargeError from body parser and return clean HTTP 413
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

  router.use(sanitizeRequestBodyMiddleware);

  // Status and quota information
  router.get("/status", publicTtsController.getStatus);

  // Public speech synthesis
  router.post("/generate", publicTtsController.synthesize);
  router.post("/", publicTtsController.synthesize);

  return router;
}

