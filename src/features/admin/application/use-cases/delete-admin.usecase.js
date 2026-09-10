import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class DeleteAdminUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute({ userId, requesterId }) {
    const admin = await this.adminRepository.getUserById(userId);

    if (!admin) {
      throw new AppError("Admin not found.", 404, "ADMIN_NOT_FOUND");
    }

    if (admin.id === requesterId) {
      throw new AppError(
        "You cannot delete your own account.",
        400,
        "SELF_DELETE_NOT_ALLOWED",
      );
    }

    if (admin.platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN accounts cannot be deleted.",
        403,
        "PLATFORM_ADMIN_DELETE_PROTECTED",
      );
    }

    await this.adminRepository.deleteAdmin(userId);
  }
}
