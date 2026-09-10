export class TtsJobRepository {
  constructor({ dataSource }) {
    this.repository = dataSource.getRepository("TtsJob");
  }

  async create({
    userId,
    text,
    status = "queued",
    totalGroups = 0,
    options = {},
  }) {
    const job = this.repository.create({
      userId,
      text,
      status,
      totalGroups,
      options,
      completedGroups: 0,
      progress: 0,
    });

    return this.repository.save(job);
  }

  async findById(id) {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async findByIdForUser(id, userId) {
    return this.repository.findOne({
      where: {
        id,
        userId,
      },
    });
  }

  async markProcessing(id, totalGroups) {
    await this.repository.update(
      {
        id,
      },
      {
        status: "processing",
        totalGroups,
        completedGroups: 0,
        progress: 0,
      },
    );

    return this.findById(id);
  }

  async updateProgress(id, completedGroups, totalGroups) {
    const progress =
      totalGroups > 0
        ? Math.min(100, Math.round((completedGroups / totalGroups) * 100))
        : 0;

    await this.repository.update(
      {
        id,
      },
      {
        completedGroups,
        totalGroups,
        progress,
      },
    );

    return this.findById(id);
  }

  async markCompleted(id, { outputPath, outputFilename }) {
    await this.repository.update(
      {
        id,
      },
      {
        status: "completed",
        completedGroups: await this._getTotalGroups(id),
        progress: 100,
        outputPath,
        outputFilename,
        errorMessage: null,
      },
    );

    return this.findById(id);
  }

  async markFailed(id, errorMessage) {
    await this.repository.update(
      {
        id,
      },
      {
        status: "failed",
        errorMessage,
      },
    );

    return this.findById(id);
  }

  async _getTotalGroups(id) {
    const job = await this.repository.findOne({
      where: {
        id,
      },
      select: ["totalGroups"],
    });

    return job?.totalGroups ?? 0;
  }
}
