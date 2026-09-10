import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class UpdateAdminStatusUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute({ userId, requesterId, isActive }) {
    const user = await this.adminRepository.getUserById(userId);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (user.id === requesterId) {
      throw new AppError(
        "You cannot change your own status.",
        400,
        "SELF_STATUS_CHANGE_NOT_ALLOWED",
      );
    }

    if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN accounts cannot have their status changed.",
        403,
        "PLATFORM_ADMIN_STATUS_PROTECTED",
      );
    }

    return await this.adminRepository.updateAdminStatus({
      userId,
      isActive,
    });
  }
}
