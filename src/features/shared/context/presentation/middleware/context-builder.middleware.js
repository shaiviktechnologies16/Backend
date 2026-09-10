export function contextBuilderMiddleware({
  resolveContextUseCase,
  workspaceMemberPermissionRepository,
  rbacRepository,
}) {
  return async (req, res, next) => {
    try {
      const user = req.context.user;

      const organizationId =
        req.headers["x-organization-id"] || req.params.organizationId || null;

      const projectId =
        req.headers["x-project-id"] || req.params.projectId || null;

      const agentId = req.headers["x-agent-id"] || req.params.agentId || null;

      const context = await resolveContextUseCase.execute({
        user,
        organizationId,
        projectId,
        agentId,
      });

      if (
        (user.platformRole === "PLATFORM_ADMIN" ||
          user.platformRole === "PLATFORM_MANAGER") &&
        !context.organization &&
        !organizationId &&
        !projectId &&
        !agentId
      ) {
        req.context = {
          ...req.context,
          user: {
            ...user,
            permissions: user.permissions || [],
          },
          membership: null,
          organization: null,
          project: null,
          agent: null,
        };

        return next();
      }

      let permissions = [];

      if (context.membership?.id) {
        console.log("WORKSPACE MEMBERSHIP:", {
          id: context.membership.id,
          role: context.membership.role,
          organizationId: context.membership.organizationId,
          userId: context.membership.userId,
        });

        if (context.membership.role === "OWNER") {
          const role = await rbacRepository.getRoleByName("WORKSPACE_OWNER");

          if (role) {
            permissions = await rbacRepository.getPermissionsByRoleId(role.id);
          }
        } else {
          permissions =
            await workspaceMemberPermissionRepository.getPermissions(
              context.membership.id,
            );
        }
      }

      req.context = {
        ...context,
        user: {
          ...context.user,
          permissions: permissions.map(
            (permission) => permission.permissionKey,
          ),
        },
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
