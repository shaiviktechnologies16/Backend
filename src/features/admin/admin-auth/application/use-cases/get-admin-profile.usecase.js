import { AppError } from "../../../../../common/errors/AppError.js";

export class GetAdminProfileUseCase {
  constructor({ adminAuthRepository, getUserPermissionsUseCase }) {
    this.adminAuthRepository = adminAuthRepository;
    this.getUserPermissionsUseCase = getUserPermissionsUseCase;
  }

  async execute(userId) {
    const admin = await this.adminAuthRepository.findById(userId);

    if (!admin) {
      throw new AppError("Admin not found.", 404, "ADMIN_NOT_FOUND");
    }

    if (!admin.isActive) {
      throw new AppError(
        "Your account has been disabled. Contact administrator.",
        403,
        "ACCOUNT_DISABLED",
      );
    }

    const permissions = await this.getUserPermissionsUseCase.execute(userId);

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      platformRole: admin.platformRole,
      isActive: admin.isActive,
      permissions: permissions.map((permission) => permission.permissionKey),
    };
  }
}
