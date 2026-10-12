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
    const {
      name,
      email,
      password,
      platformRole,
      permissions = [],
      requester,
    } = data;

    // Only authenticated platform administrators and managers
    // may create platform admin accounts.
    if (
      !requester?.id ||
      ![PlatformRole.PLATFORM_ADMIN, PlatformRole.PLATFORM_MANAGER].includes(
        requester.platformRole,
      )
    ) {
      throw new AppError(
        "Only platform administrators and managers can create admin accounts.",
        403,
        "ADMIN_CREATION_FORBIDDEN",
      );
    }

    // Only an existing PLATFORM_ADMIN may create another PLATFORM_ADMIN.
    if (
      platformRole === PlatformRole.PLATFORM_ADMIN &&
      requester.platformRole !== PlatformRole.PLATFORM_ADMIN
    ) {
      throw new AppError(
        "Only a PLATFORM_ADMIN can create another PLATFORM_ADMIN.",
        403,
        "PLATFORM_ADMIN_CREATION_PROTECTED",
      );
    }

    // Reject roles outside the supported platform-admin roles.
    if (
      ![PlatformRole.PLATFORM_ADMIN, PlatformRole.PLATFORM_MANAGER].includes(
        platformRole,
      )
    ) {
      throw new AppError(
        "Invalid platform role.",
        400,
        "INVALID_PLATFORM_ROLE",
      );
    }

    const existingUser = await this.adminRepository.getUserByEmail(email);

    if (existingUser) {
      throw new AppError("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const role = await this.rbacRepository.getRoleByName(platformRole);

    if (!role) {
      throw new AppError(
        "Platform role not found.",
        500,
        "PLATFORM_ROLE_NOT_FOUND",
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await this.adminRepository.createAdmin({
      name,
      email,
      passwordHash,
      platformRole,
      roleId: role.id,
      isActive: true,
    });

    // Platform admins receive their platform-wide permissions through
    // the existing role-handling logic, so do not assign manager permissions.
    if (
      platformRole === PlatformRole.PLATFORM_MANAGER &&
      permissions.length > 0
    ) {
      const permissionEntities =
        await this.permissionRepository.findByKeys(permissions);

      if (permissionEntities.length !== new Set(permissions).size) {
        throw new AppError(
          "One or more permissions are invalid.",
          400,
          "INVALID_PERMISSIONS",
        );
      }

      await this.userPermissionRepository.createMany(
        admin.id,
        permissionEntities.map((permission) => permission.id),
      );
    }

    return this.adminRepository.getUserById(admin.id);
  }
}
