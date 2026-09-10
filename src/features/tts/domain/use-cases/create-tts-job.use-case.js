import { TTS_JOB_STATUS } from "../constants/tts-job.constants.js";

export class CreateTtsJobUseCase {
  constructor({ ttsJobRepository }) {
    this.ttsJobRepository = ttsJobRepository;
  }

  async execute({ userId, text, totalGroups = 0, options = {} }) {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    if (!text?.trim()) {
      throw new Error("Text is required.");
    }

    const job = await this.ttsJobRepository.create({
      userId,
      text: text.trim(),
      status: TTS_JOB_STATUS.QUEUED,
      totalGroups,
      options,
    });

    return {
      id: job.id,
      status: job.status,
      totalGroups: job.totalGroups,
      completedGroups: job.completedGroups,
      progress: job.progress,
      createdAt: job.createdAt,
    };
  }
}
