import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateMemberPermissionsUseCase {
  constructor(
    organizationRepository,
    organizationMemberRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
  ) {
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.workspaceMemberPermissionRepository =
      workspaceMemberPermissionRepository;
    this.permissionRepository = permissionRepository;
  }

  async execute({ organizationId, userId, permissionIds = [] }) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    const member =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

    if (!member) {
      throw new AppError(
        "Organization member not found.",
        404,
        "MEMBER_NOT_FOUND",
      );
    }

    if (!Array.isArray(permissionIds)) {
      throw new AppError(
        "Permission IDs must be an array.",
        400,
        "INVALID_PERMISSION_IDS",
      );
    }

    const permissions = await this.permissionRepository.findAll();

    const validPermissionIds = new Set(
      permissions.map((permission) => permission.id),
    );

    const invalidPermissionIds = permissionIds.filter(
      (permissionId) => !validPermissionIds.has(permissionId),
    );

    if (invalidPermissionIds.length > 0) {
      throw new AppError(
        "One or more permissions are invalid.",
        400,
        "INVALID_PERMISSION_IDS",
      );
    }

    await this.workspaceMemberPermissionRepository.replacePermissions(
      member.id,
      permissionIds,
    );

    const updatedPermissions =
      await this.workspaceMemberPermissionRepository.getPermissions(member.id);

    return {
      memberId: member.id,
      userId: member.userId,
      organizationId,
      role: member.role,
      permissions: updatedPermissions,
    };
  }
}
