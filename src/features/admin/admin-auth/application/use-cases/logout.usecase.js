export class LogoutUseCase {
  constructor({ adminSessionRepository, tokenHashService }) {
    this.adminSessionRepository = adminSessionRepository;
    this.tokenHashService = tokenHashService;
  }

  async execute(refreshToken) {
    const refreshTokenHash = this.tokenHashService.hash(refreshToken);

    await this.adminSessionRepository.deleteByRefreshTokenHash(
      refreshTokenHash,
    );

    return {
      message: "Logout successful.",
    };
  }
}
