import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class RemoveMemberUseCase {
  constructor({ workspaceMemberRepository }) {
    this.workspaceMemberRepository = workspaceMemberRepository;
  }

  async execute({ organizationId, memberId, requesterId, requesterRole }) {
    const member = await this.workspaceMemberRepository.findById(memberId);

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
        "You cannot remove yourself.",
        400,
        "SELF_REMOVAL_NOT_ALLOWED",
      );
    }

    if (requesterRole === OrganizationRole.MEMBER) {
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
        "Admin cannot remove owner.",
        403,
        "OWNER_REMOVAL_NOT_ALLOWED",
      );
    }

    if (member.role === OrganizationRole.OWNER) {
      throw new AppError("Owner cannot be removed.", 400, "OWNER_PROTECTED");
    }

    await this.workspaceMemberRepository.remove(memberId);

    return {
      id: member.id,
      userId: member.userId,
      removed: true,
    };
  }
}
