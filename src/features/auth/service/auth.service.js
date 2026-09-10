import { AppError } from "../../../common/errors/AppError.js";
import bcrypt from "bcrypt";

import { User } from "../entity/user.entity.js";
import { PlatformRole } from "../../admin/domain/constants/platform-role.js";

export class AuthService {
  constructor({
    userRepository,
    getUserPermissionsUseCase,
    organizationMemberRepository,
    organizationRepository,
    jwtService,
  }) {
    this.userRepository = userRepository;
    this.getUserPermissionsUseCase = getUserPermissionsUseCase;
    this.organizationMemberRepository = organizationMemberRepository;
    this.organizationRepository = organizationRepository;
    this.jwtService = jwtService;
  }

  async register({ name, email, password }) {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      passwordHash,
    });

    const createdUser = await this.userRepository.create(user);

    return {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
    };
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    if (
      user.platformRole === PlatformRole.PLATFORM_ADMIN ||
      user.platformRole === PlatformRole.PLATFORM_MANAGER
    ) {
      throw new AppError(
        "Platform administrators must use admin login.",
        403,
        "USE_ADMIN_LOGIN",
      );
    }

    if (!user.isActive) {
      throw new AppError(
        "Your account has been disabled. Contact administrator.",
        403,
        "ACCOUNT_DISABLED",
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new AppError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const permissions = await this.getUserPermissionsUseCase.execute(user.id);

    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.getRoleName(),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        role: {
          id: user.role?.id ?? null,
          name: user.getRoleName(),
        },
        permissions: permissions.map((permission) => permission.permissionKey),
      },
    };
  }
}
