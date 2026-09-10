export class GetTtsJobUseCase {
  constructor({ ttsJobRepository }) {
    this.ttsJobRepository = ttsJobRepository;
  }

  async execute({ id, userId }) {
    if (!id) {
      throw new Error("TTS job ID is required.");
    }

    if (!userId) {
      throw new Error("User ID is required.");
    }

    const job = await this.ttsJobRepository.findByIdForUser(id, userId);

    if (!job) {
      const error = new Error("TTS job not found.");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: job.id,
      status: job.status,
      totalGroups: job.totalGroups,
      completedGroups: job.completedGroups,
      progress: job.progress,
      outputFilename: job.outputFilename,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
