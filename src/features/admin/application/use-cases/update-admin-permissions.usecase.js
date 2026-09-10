import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class UpdateAdminPermissionsUseCase {
  constructor({
    userPermissionRepository,
    permissionRepository,
    userRepository,
  }) {
    this.userPermissionRepository = userPermissionRepository;
    this.permissionRepository = permissionRepository;
    this.userRepository = userRepository;
  }

  async execute({ userId, permissions = [] }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (user.platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN permissions cannot be modified.",
        403,
        "PLATFORM_ADMIN_PERMISSIONS_LOCKED",
      );
    }

    const permissionEntities =
      await this.permissionRepository.findByKeys(permissions);

    const permissionIds = permissionEntities.map((permission) => permission.id);

    await this.userPermissionRepository.deleteByUserId(userId);

    if (permissionIds.length) {
      await this.userPermissionRepository.createMany(userId, permissionIds);
    }

    return {
      userId,
      permissions,
    };
  }
}
