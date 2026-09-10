export class GetSessionsUseCase {
  constructor({ adminSessionRepository }) {
    this.adminSessionRepository = adminSessionRepository;
  }

  async execute(userId) {
    const sessions = await this.adminSessionRepository.findByUserId(userId);

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
