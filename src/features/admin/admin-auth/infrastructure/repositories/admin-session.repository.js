export class AdminSessionRepository {
  constructor(dataSource) {
    this.repository = dataSource.getRepository("AdminSession");
  }

  async create(data) {
    const session = this.repository.create({
      user: {
        id: data.userId,
      },
      refreshTokenHash: data.refreshTokenHash,
      expiresAt: data.expiresAt,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
    });

    return this.repository.save(session);
  }

  async findByRefreshTokenHash(refreshTokenHash) {
    return this.repository.findOne({
      where: {
        refreshTokenHash,
      },
      relations: {
        user: true,
      },
    });
  }

  async findByUserId(userId) {
    return this.repository.find({
      where: {
        user: {
          id: userId,
        },
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  async deleteByRefreshTokenHash(refreshTokenHash) {
    return this.repository.delete({
      refreshTokenHash,
    });
  }

  async deleteByUserId(userId) {
    return this.repository.delete({
      user: {
        id: userId,
      },
    });
  }
  async deleteById(sessionId, userId) {
    return this.repository.delete({
      id: sessionId,
      user: {
        id: userId,
      },
    });
  }
}
