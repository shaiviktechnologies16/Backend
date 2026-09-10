import { AppError } from "../../../../../common/errors/AppError.js";
import { User } from "../../../../auth/entity/user.entity.js";
import { PlatformRole } from "../../../domain/constants/platform-role.js";
import envConfig from "../../../../../config/env.config.js";

export class BootstrapAdminUseCase {
  constructor({
    adminAuthRepository,
    passwordService,
    jwtService,
    adminSessionRepository,
    tokenHashService,
  }) {
    this.adminAuthRepository = adminAuthRepository;
    this.passwordService = passwordService;
    this.jwtService = jwtService;
    this.adminSessionRepository = adminSessionRepository;
    this.tokenHashService = tokenHashService;
  }

  async execute({ setupToken, name, email, password }) {
    if (!setupToken || setupToken !== envConfig.security.adminSetupToken) {
      throw new AppError(
        "Invalid admin setup token.",
        401,
        "INVALID_SETUP_TOKEN",
      );
    }

    const existingSuperAdmin = await this.adminAuthRepository.findSuperAdmin();

    if (existingSuperAdmin) {
      throw new AppError(
        "Admin bootstrap already completed.",
        409,
        "ADMIN_ALREADY_EXISTS",
      );
    }

    const existingUser = await this.adminAuthRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await this.passwordService.hash(password);

    const admin = new User({
      name,
      email,
      passwordHash,
      platformRole: PlatformRole.PLATFORM_ADMIN,
    });

    const createdAdmin = await this.adminAuthRepository.createAdmin(admin);

    const accessToken = await this.jwtService.generateAccessToken({
      userId: createdAdmin.id,
      email: createdAdmin.email,
      platformRole: createdAdmin.platformRole,
    });
    const refreshToken = await this.jwtService.generateRefreshToken({
      userId: createdAdmin.id,
    });
    const refreshTokenHash = this.tokenHashService.hash(refreshToken);

    await this.adminSessionRepository.create({
      userId: createdAdmin.id,
      refreshTokenHash,
      expiresAt: new Date(
        Date.now() + envConfig.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000,
      ),
    });

    return {
      admin: {
        id: createdAdmin.id,
        name: createdAdmin.name,
        email: createdAdmin.email,
        platformRole: createdAdmin.platformRole,
      },
      accessToken,
      refreshToken,
    };
  }
}
