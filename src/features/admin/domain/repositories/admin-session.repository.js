export class AdminSessionRepository {
  constructor(dataSource) {
    this.repository = dataSource.getRepository("AdminSession");
  }

  async create(data) {
    const session = this.repository.create(data);

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

  async deleteByRefreshTokenHash(refreshTokenHash) {
    return this.repository.delete({
      refreshTokenHash,
    });
  }
}
