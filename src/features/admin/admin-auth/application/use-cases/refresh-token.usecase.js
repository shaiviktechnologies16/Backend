import { AppError } from "../../../../../common/errors/AppError.js";
import envConfig from "../../../../../config/env.config.js";

export class RefreshTokenUseCase {
  constructor({
    adminSessionRepository,
    jwtService,
    adminAuthRepository,
    tokenHashService,
  }) {
    this.adminSessionRepository = adminSessionRepository;
    this.jwtService = jwtService;
    this.adminAuthRepository = adminAuthRepository;
    this.tokenHashService = tokenHashService;
  }

  async execute(refreshToken) {
    if (!refreshToken) {
      throw new AppError(
        "Refresh token required.",
        401,
        "REFRESH_TOKEN_REQUIRED",
      );
    }

    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    const refreshTokenHash = this.tokenHashService.hash(refreshToken);

    const session =
      await this.adminSessionRepository.findByRefreshTokenHash(
        refreshTokenHash,
      );

    if (!session) {
      throw new AppError(
        "Invalid refresh token.",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.adminSessionRepository.deleteByRefreshTokenHash(
        refreshTokenHash,
      );
      throw new AppError(
        "Refresh token expired.",
        401,
        "REFRESH_TOKEN_EXPIRED",
      );
    }

    const admin = await this.adminAuthRepository.findById(payload.userId);

    if (!admin) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    const newAccessToken = await this.jwtService.generateAccessToken({
      userId: admin.id,
      email: admin.email,
      platformRole: admin.platformRole,
    });

    const newRefreshToken = await this.jwtService.generateRefreshToken({
      userId: admin.id,
    });

    const newRefreshTokenHash = this.tokenHashService.hash(newRefreshToken);
    await this.adminSessionRepository.deleteByRefreshTokenHash(
      refreshTokenHash,
    );
    await this.adminSessionRepository.create({
      userId: admin.id,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: new Date(
        Date.now() + envConfig.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
      ),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
