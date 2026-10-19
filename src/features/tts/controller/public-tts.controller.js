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

      const isCustomCloneRequested =
        req.body?.voiceMode === "custom_clone" ||
        req.body?.voice_mode === "custom_clone";
      const hasUploadedAudio = Boolean(
        typeof req.body?.referenceAudioBase64 === "string" &&
          req.body.referenceAudioBase64.trim()
      );

      if (isCustomCloneRequested && !hasUploadedAudio) {
        return res.status(400).json({
          success: false,
          error: {
            code: "REFERENCE_AUDIO_REQUIRED",
            message:
              "Reference audio is required when custom voice cloning is requested.",
          },
        });
      }

      // Validate referenceAudioBase64 if present
      if (
        req.body?.referenceAudioBase64 !== undefined &&
        req.body?.referenceAudioBase64 !== null
      ) {
        if (typeof req.body.referenceAudioBase64 !== "string") {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Reference audio must be a valid Base64 string.",
            },
          });
        }

        const trimmedAudio = req.body.referenceAudioBase64.trim();
        if (!trimmedAudio) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Reference audio payload cannot be empty.",
            },
          });
        }

        let rawBase64 = trimmedAudio;
        if (rawBase64.startsWith("data:")) {
          const commaIndex = rawBase64.indexOf(",");
          if (commaIndex !== -1) {
            rawBase64 = rawBase64.slice(commaIndex + 1);
          }
        }
        const estimatedBytes = Math.floor((rawBase64.length * 3) / 4);
        if (estimatedBytes > 15 * 1024 * 1024) {
          return res.status(413).json({
            success: false,
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message:
                "Request entity too large. The reference audio upload exceeds the maximum allowed limit of 15 MB.",
            },
          });
        }
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

        const hasRefAudio = Boolean(
          typeof req.body.referenceAudioBase64 === "string" &&
            req.body.referenceAudioBase64.trim()
        );
        const hasRefText = Boolean(
          typeof req.body.referenceText === "string" &&
            req.body.referenceText.trim()
        );

        console.log("[PublicTTSController] Dispatching synthesis usecase:", {
          visitorId,
          textLength: cleanText.length,
          speed: validSpeed,
          hasReferenceAudio: hasRefAudio,
          referenceAudioStringLength: hasRefAudio ? req.body.referenceAudioBase64.length : 0,
          hasReferenceText: hasRefText,
          referenceTextLength: hasRefText ? req.body.referenceText.length : 0,
        });

        const result = await synthesizeSpeechUseCase.execute({
          text: cleanText,
          options: {
            provider: "fish_audio",
            voiceMode: req.body?.voiceMode || (hasRefAudio ? "custom_clone" : "studio_preset"),
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

        console.log("[PublicTTSController] Synthesis completed successfully:", {
          visitorId,
          voiceSource: result.referenceSource || (hasRefAudio ? "uploaded" : "default"),
          outputFormat: result.format || "mp3",
          audioByteLength: result.audio?.length || 0,
          filename,
        });

        res.setHeader("Content-Type", result.contentType || "audio/mpeg");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        res.setHeader("x-daily-remaining", String(reservation.visitorRemaining));
        res.setHeader("x-global-remaining", String(reservation.globalRemaining));
        res.setHeader(
          "x-voice-source",
          result.referenceSource || (hasRefAudio ? "uploaded" : "default")
        );
        res.setHeader(
          "x-voice-mode",
          hasRefAudio ? "custom_clone" : "studio_preset"
        );

        return res.send(result.audio);
      } catch (err) {
        const isQuotaExhausted = ttsDemoGuardService.isQuotaExhaustionError(err);
        const isPayloadTooLarge =
          err.statusCode === 413 ||
          err.status === 413 ||
          err.code === "PAYLOAD_TOO_LARGE" ||
          err.type === "entity.too.large" ||
          err.name === "PayloadTooLargeError" ||
          (typeof err.message === "string" &&
            err.message.toLowerCase().includes("exceeds maximum size limit"));

        const statusCode = isQuotaExhausted
          ? 429
          : isPayloadTooLarge
            ? 413
            : err.statusCode || err.status || 500;

        ttsDemoGuardService.release(visitorId, {
          success: false,
          providerExhausted: isQuotaExhausted,
          error: err,
          statusCode,
        });

        const errorCode = isQuotaExhausted
          ? "PROVIDER_QUOTA_EXHAUSTED"
          : isPayloadTooLarge
            ? "PAYLOAD_TOO_LARGE"
            : err.code || err.errorCode || "TTS_SYNTHESIS_FAILED";

        const userMessage = isQuotaExhausted
          ? "The AI voice provider daily quota has been exceeded for today. Please try again tomorrow."
          : err.message || "Failed to synthesize speech. Please try again.";

        return res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: userMessage,
          },
        });
      }
    },
  };
}

