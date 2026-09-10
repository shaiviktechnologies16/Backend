import { Router } from "express";

import { authenticate } from "../../../../../common/middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/admin-auth.middleware.js";
import { PlatformRole } from "../../../domain/constants/platform-role.js";
import { createAuthenticationRateLimiter } from "../../../../../common/middleware/rate-limit.middleware.js";

export function createAdminAuthRoutes({
  adminAuthController,
  requirePlatformRoleUseCase,
  userRepository,
  jwtService,
  captchaMiddleware,
}) {
  const router = Router();
  const authMiddleware = authenticate(userRepository, jwtService);
  const authenticationRateLimiter = createAuthenticationRateLimiter();

  router.post(
    "/bootstrap",
    adminAuthController.bootstrap.bind(adminAuthController),
  );

  const loginMiddlewares = [authenticationRateLimiter];
  if (captchaMiddleware) {
    loginMiddlewares.push(captchaMiddleware);
  }

  router.post(
    "/login",
    ...loginMiddlewares,
    adminAuthController.login.bind(adminAuthController),
  );

  router.get(
    "/me",
    authMiddleware,
    adminAuthController.me.bind(adminAuthController),
  );

  router.get(
    "/sessions",
    authMiddleware,
    adminAuthController.sessions.bind(adminAuthController),
  );

  router.post(
    "/refresh",
    adminAuthController.refreshToken.bind(adminAuthController),
  );

  router.post("/logout", adminAuthController.logout.bind(adminAuthController));

  router.post(
    "/logout-all",
    authMiddleware,
    adminAuthController.logoutAll.bind(adminAuthController),
  );

  router.post(
    "/create",
    authMiddleware,
    requirePlatformRole(requirePlatformRoleUseCase, [
      PlatformRole.PLATFORM_ADMIN,
    ]),
    adminAuthController.createAdmin.bind(adminAuthController),
  );

  router.patch(
    "/change-password",
    authMiddleware,
    adminAuthController.changePassword.bind(adminAuthController),
  );

  router.delete(
    "/sessions/:sessionId",
    authMiddleware,
    adminAuthController.revokeSession.bind(adminAuthController),
  );

  return router;
}
