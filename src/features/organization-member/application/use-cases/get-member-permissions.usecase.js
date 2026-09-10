import { AppError } from "../../../../common/errors/AppError.js";

export class GetMemberPermissionsUseCase {
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

  async execute({ organizationId, userId }) {
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

    const permissions =
      await this.workspaceMemberPermissionRepository.getPermissions(member.id);

    return {
      memberId: member.id,
      userId: member.userId,
      organizationId: member.organizationId,
      role: member.role,
      permissions,
    };
  }
}
