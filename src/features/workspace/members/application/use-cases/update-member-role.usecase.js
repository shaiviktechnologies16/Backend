import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class UpdateMemberRoleUseCase {
  constructor({ workspaceMemberRepository }) {
    this.workspaceMemberRepository = workspaceMemberRepository;
  }

  async execute({ organizationId, requesterRole, memberId, role }) {
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

    if (requesterRole === OrganizationRole.MEMBER) {
      throw new AppError(
        "You do not have permission.",
        403,
        "INSUFFICIENT_PERMISSION",
      );
    }

    if (
      requesterRole === OrganizationRole.ADMIN &&
      role === OrganizationRole.OWNER
    ) {
      throw new AppError(
        "Admin cannot assign owner role.",
        403,
        "OWNER_ASSIGN_NOT_ALLOWED",
      );
    }

    // OWNER protection
    if (
      member.role === OrganizationRole.OWNER &&
      role !== OrganizationRole.OWNER
    ) {
      throw new AppError(
        "Owner role cannot be changed.",
        400,
        "OWNER_ROLE_PROTECTED",
      );
    }

    const allowedRoles = [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
    ];

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Invalid organization role.",
        400,
        "INVALID_ORGANIZATION_ROLE",
      );
    }

    if (role === OrganizationRole.OWNER) {
      const existingOwner =
        await this.workspaceMemberRepository.findOwnerByOrganizationId(
          organizationId,
        );

      if (existingOwner && existingOwner.id !== member.id) {
        throw new AppError(
          "Organization already has an owner.",
          400,
          "OWNER_ALREADY_EXISTS",
        );
      }
    }
    return this.workspaceMemberRepository.updateRole(memberId, role);
  }
}
