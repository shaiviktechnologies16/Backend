import { AppError } from "../../../../common/errors/AppError.js";

export const requirePermission =
  ({
    getUserPermissionsUseCase,
    workspaceMemberPermissionRepository,
    organizationMemberRepository,
    rbacRepository,
    permission,
  }) =>
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new AppError("Unauthorized.", 401, "UNAUTHORIZED");
      }

      if (req.user.platformRole === "PLATFORM_ADMIN") {
        return next();
      }

      if (req.user.platformRole === "PLATFORM_MANAGER") {
        const permissions = await getUserPermissionsUseCase.execute(
          req.user.id,
        );

        const hasPermission = permissions.some(
          (item) => item.permissionKey === permission,
        );

        if (!hasPermission) {
          throw new AppError("Permission denied.", 403, "PERMISSION_DENIED");
        }

        return next();
      }

      const organizationId =
        req.headers["x-organization-id"] ||
        req.context?.organization?.id ||
        req.context?.organizationId;

      if (!organizationId) {
        throw new AppError(
          "Organization context is required.",
          400,
          "ORGANIZATION_CONTEXT_REQUIRED",
        );
      }

      const membership =
        await organizationMemberRepository.findByOrganizationAndUser(
          organizationId,
          req.user.id,
        );

      if (!membership) {
        throw new AppError(
          "You are not a member of this organization.",
          403,
          "ORGANIZATION_ACCESS_DENIED",
        );
      }

      let permissions = [];

      if (membership.role === "OWNER") {
        const role = await rbacRepository.getRoleByName("WORKSPACE_OWNER");

        if (role) {
          permissions = await rbacRepository.getPermissionsByRoleId(role.id);
        }
      } else {
        permissions = await workspaceMemberPermissionRepository.getPermissions(
          membership.id,
        );
      }

      const hasPermission = permissions.some(
        (item) => item.permissionKey === permission,
      );

      if (!hasPermission) {
        throw new AppError("Permission denied.", 403, "PERMISSION_DENIED");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
