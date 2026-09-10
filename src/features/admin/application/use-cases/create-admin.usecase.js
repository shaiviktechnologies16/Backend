import bcrypt from "bcryptjs";
import { AppError } from "../../../../common/errors/AppError.js";
import { PlatformRole } from "../../domain/constants/platform-role.js";

export class CreateAdminUseCase {
  constructor(
    adminRepository,
    permissionRepository,
    userPermissionRepository,
    rbacRepository,
  ) {
    this.adminRepository = adminRepository;
    this.permissionRepository = permissionRepository;
    this.userPermissionRepository = userPermissionRepository;
    this.rbacRepository = rbacRepository;
  }

  async execute(data) {
    const { name, email, password, platformRole, permissions = [] } = data;

    if (platformRole === PlatformRole.PLATFORM_ADMIN) {
      throw new AppError(
        "PLATFORM_ADMIN accounts cannot be created manually.",
        403,
        "PLATFORM_ADMIN_CREATION_PROTECTED",
      );
    }

    const existingUser = await this.adminRepository.getUserByEmail(email);

    if (existingUser) {
      throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const role = await this.rbacRepository.getRoleByName(platformRole);

    if (!role) {
      throw new AppError("Platform admin role not found.", 500);
    }

    const admin = await this.adminRepository.createAdmin({
      name,
      email,
      passwordHash,
      platformRole,
      roleId: role.id,
      isActive: true,
    });

    if (permissions.length > 0) {
      const permissionEntities =
        await this.permissionRepository.findByKeys(permissions);

      await this.userPermissionRepository.createMany(
        admin.id,
        permissionEntities.map((permission) => permission.id),
      );
    }

    return this.adminRepository.getUserById(admin.id);
  }
}
