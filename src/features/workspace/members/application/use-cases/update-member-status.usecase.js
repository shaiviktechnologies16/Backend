import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class UpdateMemberStatusUseCase {
  constructor({ workspaceMemberRepository, userRepository }) {
    this.workspaceMemberRepository = workspaceMemberRepository;
    this.userRepository = userRepository;
  }

  async execute({
    organizationId,
    memberId,
    requesterId,
    requesterRole,
    isActive,
  }) {
    const member =
      await this.workspaceMemberRepository.findByIdIncludingRemoved(memberId);

    if (!member) {
      throw new AppError(
        "Workspace member not found.",
        404,
        "WORKSPACE_MEMBER_NOT_FOUND",
      );
    }

    if (member.organizationId !== organizationId) {
      throw new AppError(
        "Member does not belong to organization.",
        403,
        "ORGANIZATION_ACCESS_DENIED",
      );
    }

    if (member.userId === requesterId) {
      throw new AppError(
        "You cannot change your own status.",
        400,
        "SELF_STATUS_CHANGE_NOT_ALLOWED",
      );
    }

    if (
      requesterRole !== OrganizationRole.OWNER &&
      requesterRole !== OrganizationRole.ADMIN
    ) {
      throw new AppError(
        "You do not have permission.",
        403,
        "INSUFFICIENT_PERMISSION",
      );
    }

    if (
      requesterRole === OrganizationRole.ADMIN &&
      member.role === OrganizationRole.OWNER
    ) {
      throw new AppError(
        "Admin cannot change owner status.",
        403,
        "OWNER_STATUS_CHANGE_NOT_ALLOWED",
      );
    }

    if (member.status === "REMOVED") {
      throw new AppError(
        "Removed member cannot have its status changed.",
        400,
        "MEMBER_REMOVED",
      );
    }

    const status = isActive ? "ACTIVE" : "INACTIVE";

    await this.workspaceMemberRepository.updateStatus(memberId, status);

    await this.userRepository.updateStatus(member.userId, isActive);

    return {
      memberId,
      isActive,
    };
  }
}
