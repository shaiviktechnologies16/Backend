import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class DeleteUserUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute({ userId, requesterId }) {
    // Prevent deleting yourself
    if (userId === requesterId) {
      throw new AppError(
        "You cannot delete your own account.",
        400,
        "SELF_DELETE_NOT_ALLOWED",
      );
    }

    const user = await this.adminRepository.getUserById(userId);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
      const superAdminCount = await this.adminRepository.countSuperAdmins();

      if (superAdminCount <= 1) {
        throw new AppError(
          "Cannot delete the last platform admin.",
          400,
          "LAST_PLATFORM_ADMIN",
        );
      }
    }

    await this.adminRepository.deleteUser(userId);

    return true;
  }
}
