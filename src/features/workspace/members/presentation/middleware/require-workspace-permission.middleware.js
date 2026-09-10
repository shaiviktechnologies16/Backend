import { AppError } from "../../../../../common/errors/AppError.js";

export const requireWorkspacePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.context?.user;

      if (!user?.id) {
        throw new AppError("Unauthorized.", 401, "UNAUTHORIZED");
      }

      const permissions = user.permissions || [];

      if (!permissions.includes(permission)) {
        throw new AppError("Permission denied.", 403, "PERMISSION_DENIED");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
