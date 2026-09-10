export function createTTSController({ synthesizeSpeechUseCase }) {
  return {
    async synthesize(req, res, next) {
      try {
        const result = await synthesizeSpeechUseCase.execute({
          text: req.body.text,
          options: {
            speed: req.body.speed,
            speakingStyle: req.body.speakingStyle,
            steps: req.body.steps,
            referenceAudioBase64: req.body.referenceAudioBase64,
            referenceText: req.body.referenceText,
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
