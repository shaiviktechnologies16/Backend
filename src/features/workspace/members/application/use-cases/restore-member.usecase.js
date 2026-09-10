import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class RestoreMemberUseCase {
  constructor({ workspaceMemberRepository }) {
    this.workspaceMemberRepository = workspaceMemberRepository;
  }

  async execute({ organizationId, memberId, requesterRole }) {
    const member =
      await this.workspaceMemberRepository.findByIdIncludingRemoved(memberId);

    if (!member) {
      throw new AppError("Member not found.", 404, "MEMBER_NOT_FOUND");
    }

    if (member.organizationId !== organizationId) {
      throw new AppError(
        "Member does not belong to organization.",
        403,
        "ORGANIZATION_ACCESS_DENIED",
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

    if (member.status === "ACTIVE") {
      throw new AppError(
        "Member is already active.",
        400,
        "MEMBER_ALREADY_ACTIVE",
      );
    }

    if (member.status !== "REMOVED") {
      throw new AppError(
        "Only removed members can be restored.",
        400,
        "MEMBER_NOT_REMOVED",
      );
    }

    if (
      requesterRole === OrganizationRole.ADMIN &&
      member.role === OrganizationRole.OWNER
    ) {
      throw new AppError(
        "Admin cannot restore owner.",
        403,
        "OWNER_RESTORE_NOT_ALLOWED",
      );
    }

    return this.workspaceMemberRepository.restore(memberId);
  }
}
