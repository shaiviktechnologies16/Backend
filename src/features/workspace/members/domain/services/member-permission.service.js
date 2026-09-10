import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class MemberPermissionService {
  static canManageMembers(requesterRole) {
    return (
      requesterRole === OrganizationRole.OWNER ||
      requesterRole === OrganizationRole.ADMIN
    );
  }

  static validateCanManageMembers(requesterRole) {
    if (!this.canManageMembers(requesterRole)) {
      throw new AppError(
        "You do not have permission.",
        403,
        "INSUFFICIENT_PERMISSION",
      );
    }
  }

  static validateCanAssignRole(requesterRole, targetRole, newRole) {
    // OWNER can manage ADMIN/MEMBER
    if (requesterRole === OrganizationRole.OWNER) {
      if (
        newRole === OrganizationRole.OWNER &&
        targetRole !== OrganizationRole.OWNER
      ) {
        throw new AppError(
          "Cannot assign owner role.",
          403,
          "OWNER_ASSIGN_NOT_ALLOWED",
        );
      }

      return;
    }

    // ADMIN restrictions
    if (requesterRole === OrganizationRole.ADMIN) {
      if (
        targetRole === OrganizationRole.OWNER ||
        newRole === OrganizationRole.OWNER ||
        newRole === OrganizationRole.ADMIN
      ) {
        throw new AppError(
          "Admin cannot manage owner/admin roles.",
          403,
          "ROLE_CHANGE_NOT_ALLOWED",
        );
      }

      return;
    }

    throw new AppError(
      "You do not have permission.",
      403,
      "INSUFFICIENT_PERMISSION",
    );
  }
}
