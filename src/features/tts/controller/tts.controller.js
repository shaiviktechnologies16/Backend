const MAX_REFERENCE_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB binary limit

function getBase64DecodedByteLength(base64Str) {
  if (!base64Str || typeof base64Str !== "string") return 0;
  let clean = base64Str.trim();
  const commaIdx = clean.indexOf(",");
  if (commaIdx !== -1) {
    clean = clean.slice(commaIdx + 1);
  }
  clean = clean.replace(/\s+/g, "");
  let padding = 0;
  if (clean.endsWith("==")) padding = 2;
  else if (clean.endsWith("=")) padding = 1;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

export function createTTSController({ synthesizeSpeechUseCase }) {
  return {
    async synthesize(req, res, next) {
      try {
        const referenceAudio =
          req.body.referenceAudioBase64 || req.body.reference_audio_base64;

        if (referenceAudio) {
          const byteLength = getBase64DecodedByteLength(referenceAudio);
          if (byteLength > MAX_REFERENCE_AUDIO_BYTES) {
            return res.status(413).json({
              success: false,
              error: {
                code: "PAYLOAD_TOO_LARGE",
                message: `Reference audio exceeds maximum allowed size of 15 MB.`,
              },
            });
          }
        }

        const result = await synthesizeSpeechUseCase.execute({
          text: req.body.text,
          provider: req.body.provider,
          options: {
            provider: req.body.provider,
            voiceMode: req.body.voiceMode,
            speed: req.body.speed,
            speakingStyle: req.body.speakingStyle,
            steps: req.body.steps,
            referenceAudioBase64:
              req.body.referenceAudioBase64 || req.body.reference_audio_base64,
            referenceText: req.body.referenceText || req.body.reference_text,
            debug: req.body.debug,
          },
        });

        res.setHeader("Content-Type", result.contentType);

        res.setHeader(
          "Content-Disposition",
          `inline; filename="${result.filename}"`,
        );

        res.send(result.audio);
      } catch (error) {
        next(error);
      }
    },
  };
}
