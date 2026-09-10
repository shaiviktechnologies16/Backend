import { AdminAuthRepositoryImpl } from "./infrastructure/repositories/admin-auth.repository.impl.js";

import { AdminLoginUseCase } from "./application/use-cases/admin-login.usecase.js";
import { BootstrapAdminUseCase } from "./application/use-cases/bootstrap-admin.usecase.js";
import { CreateAdminUseCase } from "./application/use-cases/create-admin.usecase.js";

import { AdminAuthController } from "./presentation/controllers/admin-auth.controller.js";

import { GetUserPermissionsUseCase } from "../../rbac/application/use-cases/get-user-permissions.usecase.js";

import { UserPermissionRepository } from "../../rbac/infrastructure/repositories/user-permission.repository.js";
import { PermissionRepository } from "../../rbac/infrastructure/repositories/permission.repository.js";

import { AssignUserPermissionsUseCase } from "../../rbac/application/use-cases/assign-user-permissions.usecase.js";

import { ChangePasswordUseCase } from "./application/use-cases/change-password.usecase.js";
import { RefreshTokenUseCase } from "./application/use-cases/refresh-token.usecase.js";
import { AdminSessionRepository } from "./infrastructure/repositories/admin-session.repository.js";
import { LogoutUseCase } from "./application/use-cases/logout.usecase.js";
import { GetAdminProfileUseCase } from "./application/use-cases/get-admin-profile.usecase.js";
import { GetSessionsUseCase } from "./application/use-cases/get-sessions.usecase.js";
import { LogoutAllSessionsUseCase } from "./application/use-cases/logout-all-sessions.usecase.js";
import { RevokeSessionUseCase } from "./application/use-cases/revoke-session.usecase.js";

export function createAdminAuthModule({
  dataSource,
  jwtService,
  tokenHashService,
  passwordService,
  organizationMemberRepository,
  organizationRepository,
  workspaceMemberPermissionRepository,
  rbacRepository,
}) {
  const adminAuthRepository = new AdminAuthRepositoryImpl(dataSource);

  const adminSessionRepository = new AdminSessionRepository(dataSource);

  const userPermissionRepository = new UserPermissionRepository(dataSource);

  const permissionRepository = new PermissionRepository(dataSource);

  const assignUserPermissionsUseCase = new AssignUserPermissionsUseCase({
    permissionRepository,
    userPermissionRepository,
  });

  const getUserPermissionsUseCase = new GetUserPermissionsUseCase(
    rbacRepository,
  );

  const getAdminProfileUseCase = new GetAdminProfileUseCase({
    adminAuthRepository,
    getUserPermissionsUseCase,
  });

  const getSessionsUseCase = new GetSessionsUseCase({
    adminSessionRepository,
  });

  const adminLoginUseCase = new AdminLoginUseCase({
    adminAuthRepository,
    passwordService,
    jwtService,
    tokenHashService,
    getUserPermissionsUseCase,
    organizationMemberRepository,
    organizationRepository,
    adminSessionRepository,
    workspaceMemberPermissionRepository,
    rbacRepository,
    permissionRepository,
  });

  const bootstrapAdminUseCase = new BootstrapAdminUseCase({
    adminAuthRepository,
    passwordService,
    jwtService,
    adminSessionRepository,
    tokenHashService,
  });

  const createAdminUseCase = new CreateAdminUseCase({
    adminAuthRepository,
    passwordService,
    assignUserPermissionsUseCase,
  });

  const changePasswordUseCase = new ChangePasswordUseCase({
    adminAuthRepository,
    passwordService,
    adminSessionRepository,
  });

  const refreshTokenUseCase = new RefreshTokenUseCase({
    adminSessionRepository,
    jwtService,
    adminAuthRepository,
    tokenHashService,
  });

  const logoutUseCase = new LogoutUseCase({
    adminSessionRepository,
    tokenHashService,
  });

  const logoutAllSessionsUseCase = new LogoutAllSessionsUseCase({
    adminSessionRepository,
  });

  const revokeSessionUseCase = new RevokeSessionUseCase({
    adminSessionRepository,
  });

  const adminAuthController = new AdminAuthController({
    adminLoginUseCase,
    bootstrapAdminUseCase,
    createAdminUseCase,
    getAdminProfileUseCase,
    changePasswordUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    getSessionsUseCase,
    logoutAllSessionsUseCase,
    revokeSessionUseCase,
  });

  return {
    adminAuthRepository,
    adminSessionRepository,
    adminLoginUseCase,
    bootstrapAdminUseCase,
    createAdminUseCase,
    getAdminProfileUseCase,
    adminAuthController,
    changePasswordUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    getSessionsUseCase,
  };
}
