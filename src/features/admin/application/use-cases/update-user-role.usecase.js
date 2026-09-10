import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class UpdateUserRoleUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute({ userId, platformRole, requesterId }) {
    const allowedRoles = [
      PlatformRole.USER,
      PlatformRole.CUSTOMER,
      PlatformRole.PLATFORM_MANAGER,
    ];

    const user = await this.adminRepository.getUserById(userId);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN role cannot be assigned manually.",
        403,
        "PLATFORM_ADMIN_ROLE_PROTECTED",
      );
    }

    if (!allowedRoles.includes(platformRole)) {
      throw new AppError("Invalid platform role.", 400, "INVALID_ROLE");
    }

    if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN role cannot be modified.",
        403,
        "PLATFORM_ADMIN_ROLE_PROTECTED",
      );
    }

    if (userId === requesterId) {
      throw new AppError(
        "You cannot modify your own platform role.",
        403,
        "SELF_ROLE_CHANGE_NOT_ALLOWED",
      );
    }

    return this.adminRepository.updatePlatformRole(userId, platformRole);
  }
}
