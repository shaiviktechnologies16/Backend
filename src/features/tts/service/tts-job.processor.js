export class TtsJobProcessor {
  constructor({ ttsJobRepository, synthesizeSpeechUseCase }) {
    this.ttsJobRepository = ttsJobRepository;
    this.synthesizeSpeechUseCase = synthesizeSpeechUseCase;
  }

  async process(jobId) {
    const job = await this.ttsJobRepository.findById(jobId);

    if (!job) {
      throw new Error(`TTS job not found: ${jobId}`);
    }

    if (job.status === "completed") {
      return job;
    }

    try {
      await this.ttsJobRepository.markProcessing(jobId, 1);

      const result = await this.synthesizeSpeechUseCase.execute({
        text: job.text,
        options: job.options || {},
      });

      console.log("TTS RESULT:", result);

      await this.ttsJobRepository.updateProgress(jobId, 1, 1);

      return await this.ttsJobRepository.markCompleted(jobId, {
        outputPath: result.outputPath,
        outputFilename: result.filename,
      });
    } catch (error) {
      await this.ttsJobRepository.markFailed(
        jobId,
        error?.message || "TTS generation failed.",
      );

      throw error;
    }
  }
}
