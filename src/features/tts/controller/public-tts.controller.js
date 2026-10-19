import { asyncHandler } from "../../../common/utils/asyncHandler.js";

function getVisitorIdentifier(req) {
  const headerId = req.headers["x-visitor-id"];
  if (headerId && typeof headerId === "string" && headerId.trim()) {
    return headerId.trim();
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  return req.ip || req.socket?.remoteAddress || "anonymous_visitor";
}

export function createPublicTtsController({
  synthesizeSpeechUseCase,
  ttsDemoGuardService,
}) {
  return {
    getStatus: asyncHandler(async (req, res) => {
      const visitorId = getVisitorIdentifier(req);
      const status = ttsDemoGuardService.getStatus(visitorId);

      return res.status(200).json({
        success: true,
        data: {
          ...status,
          voice: "Shaivik AI Studio Voice",
          model: "Fish Audio S2.1 Pro Free",
          supportedLanguages: ["te", "en"],
        },
      });
    }),

    synthesize: async (req, res) => {
      const visitorId = getVisitorIdentifier(req);
      const rawText = req.body?.text;
      const speed = req.body?.speed;

      // 1. Validation
      if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Text is required for speech synthesis.",
          },
        });
      }

      const cleanText = rawText.normalize("NFC").trim();

      // 2. Reserve quota slot atomically
      let reservation;
      try {
        reservation = ttsDemoGuardService.reserve(visitorId, cleanText.length);
      } catch (guardError) {
        return res.status(guardError.statusCode || 429).json({
          success: false,
          error: {
            code: guardError.code || "RATE_LIMIT_EXCEEDED",
            message: guardError.message,
            retryAfterMs: guardError.retryAfterMs,
          },
        });
      }

      // 3. Perform generation
      try {
        const speedNum = Number(speed);
        const validSpeed =
          !isNaN(speedNum) && speedNum >= 0.5 && speedNum <= 2.0
            ? speedNum
            : 1.0;

        const result = await synthesizeSpeechUseCase.execute({
          text: cleanText,
          options: {
            provider: "fish_audio",
            speed: validSpeed,
            referenceAudioBase64:
              typeof req.body.referenceAudioBase64 === "string"
                ? req.body.referenceAudioBase64
                : undefined,
            referenceText:
              typeof req.body.referenceText === "string"
                ? req.body.referenceText
                : undefined,
          },
        });

        ttsDemoGuardService.release(visitorId, { success: true });

        const filename =
          result.filename || `shaivik-voice-${Date.now()}.${result.format || "mp3"}`;

        res.setHeader("Content-Type", result.contentType || "audio/mpeg");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader("x-daily-remaining", String(reservation.visitorRemaining));
        res.setHeader("x-global-remaining", String(reservation.globalRemaining));

        return res.send(result.audio);
      } catch (err) {
        const isQuotaExhausted = ttsDemoGuardService.isQuotaExhaustionError(err);
        const statusCode = isQuotaExhausted
          ? 429
          : err.statusCode || err.status || 500;

        ttsDemoGuardService.release(visitorId, {
          success: false,
          providerExhausted: isQuotaExhausted,
          error: err,
          statusCode,
        });

        const userMessage = isQuotaExhausted
          ? "The AI voice provider daily quota has been exceeded for today. Please try again tomorrow."
          : err.message || "Failed to synthesize speech. Please try again.";

        return res.status(statusCode).json({
          success: false,
          error: {
            code: isQuotaExhausted ? "PROVIDER_QUOTA_EXHAUSTED" : "TTS_SYNTHESIS_FAILED",
            message: userMessage,
          },
        });
      }
    },
  };
}

