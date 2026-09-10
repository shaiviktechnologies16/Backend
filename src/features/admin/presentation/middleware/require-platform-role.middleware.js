import { AppError } from "../../../../common/errors/AppError.js";

export const requirePlatformRole =
  (requirePlatformRoleUseCase, allowedRoles) => async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new AppError("Unauthorized.", 401, "UNAUTHORIZED");
      }

      await requirePlatformRoleUseCase.execute({
        userId: req.user.id,
        allowedRoles,
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
