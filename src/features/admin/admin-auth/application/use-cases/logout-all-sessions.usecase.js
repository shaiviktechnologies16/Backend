export class LogoutAllSessionsUseCase {
  constructor({ adminSessionRepository }) {
    this.adminSessionRepository = adminSessionRepository;
  }

  async execute(userId) {
    await this.adminSessionRepository.deleteByUserId(userId);

    return {
      message: "Logged out from all devices.",
    };
  }
}
