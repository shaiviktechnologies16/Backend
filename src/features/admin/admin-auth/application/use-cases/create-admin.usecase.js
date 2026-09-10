import { AppError } from "../../../../../common/errors/AppError.js";
import { User } from "../../../../auth/entity/user.entity.js";
import { PlatformRole } from "../../../domain/constants/platform-role.js";

export class CreateAdminUseCase {
  constructor({
    adminAuthRepository,
    passwordService,
    assignUserPermissionsUseCase,
  }) {
    this.adminAuthRepository = adminAuthRepository;
    this.passwordService = passwordService;
    this.assignUserPermissionsUseCase = assignUserPermissionsUseCase;
  }

  async execute({
    name,
    email,
    password,
    platformRole,
    roleId,
    permissions = [],
  }) {
    const existingUser = await this.adminAuthRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    if (
      platformRole !== PlatformRole.PLATFORM_ADMIN &&
      platformRole !== PlatformRole.PLATFORM_MANAGER
    ) {
      throw new AppError("Invalid admin role.", 400, "INVALID_ADMIN_ROLE");
    }

    const passwordHash = await this.passwordService.hash(password);

    const admin = new User({
      name,
      email,
      passwordHash,
      platformRole,
      role: roleId
        ? {
            id: roleId,
          }
        : null,
    });

    const created = await this.adminAuthRepository.createAdmin(admin);

    if (platformRole === PlatformRole.PLATFORM_MANAGER && permissions.length) {
      await this.assignUserPermissionsUseCase.execute({
        userId: created.id,
        permissions,
      });
    }

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      platformRole: created.platformRole,
    };
  }
}
