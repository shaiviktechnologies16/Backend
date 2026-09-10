import { AdminRepositoryImpl } from "./infrastructure/repositories/admin.repository.impl.js";
import { AdminController } from "./presentation/controllers/admin.controller.js";

import { GetDashboardStatsUseCase } from "./application/use-cases/get-dashboard-stats.usecase.js";
import { GetUsersUseCase } from "./application/use-cases/get-users.usecase.js";
import { GetAdminsUseCase } from "./application/use-cases/get-admins.usecase.js";
import { GetUserByIdUseCase } from "./application/use-cases/get-user-by-id.usecase.js";
import { RequirePlatformRoleUseCase } from "./application/use-cases/require-platform-role.usecase.js";
import { UpdateUserRoleUseCase } from "./application/use-cases/update-user-role.usecase.js";
import { DeleteUserUseCase } from "./application/use-cases/delete-user.usecase.js";
import { UpdateAdminStatusUseCase } from "./application/use-cases/update-admin-status.usecase.js";
import { DeleteAdminUseCase } from "./application/use-cases/delete-admin.usecase.js";
import { CreateAdminUseCase } from "./application/use-cases/create-admin.usecase.js";
import { UpdateAdminPermissionsUseCase } from "./application/use-cases/update-admin-permissions.usecase.js";

import { UserPermissionRepository } from "../rbac/infrastructure/repositories/user-permission.repository.js";
import { PermissionRepository } from "../rbac/infrastructure/repositories/permission.repository.js";
import { RbacRepositoryImpl } from "../rbac/infrastructure/repositories/rbac.repository.impl.js";
import { RbacDataSource } from "../rbac/infrastructure/datasource/rbac.datasource.js";

export function createAdminModule({
  dataSource,
  userRepository,
  getUserPermissionsUseCase,
  aiProviderFactory,
}) {
  const adminRepository = new AdminRepositoryImpl(
    dataSource,
    aiProviderFactory,
  );

  const userPermissionRepository = new UserPermissionRepository(dataSource);

  const permissionRepository = new PermissionRepository(dataSource);

  const rbacDataSource = new RbacDataSource();

  const rbacRepository = new RbacRepositoryImpl(rbacDataSource);

  const getDashboardStatsUseCase = new GetDashboardStatsUseCase(
    adminRepository,
  );

  const getUsersUseCase = new GetUsersUseCase(adminRepository);

  const getAdminsUseCase = new GetAdminsUseCase(adminRepository);

  const getUserByIdUseCase = new GetUserByIdUseCase(adminRepository);

  const updateUserRoleUseCase = new UpdateUserRoleUseCase(adminRepository);

  const requirePlatformRoleUseCase = new RequirePlatformRoleUseCase(
    userRepository,
  );

  const deleteUserUseCase = new DeleteUserUseCase(adminRepository);

  const updateAdminStatusUseCase = new UpdateAdminStatusUseCase(
    adminRepository,
  );

  const deleteAdminUseCase = new DeleteAdminUseCase(adminRepository);

  const updateAdminPermissionsUseCase = new UpdateAdminPermissionsUseCase({
    userPermissionRepository,
    permissionRepository,
    userRepository,
  });
  const createAdminUseCase = new CreateAdminUseCase(
    adminRepository,
    permissionRepository,
    userPermissionRepository,
    rbacRepository,
  );

  const adminController = new AdminController(
    getDashboardStatsUseCase,
    getUsersUseCase,
    getAdminsUseCase,
    getUserByIdUseCase,
    updateUserRoleUseCase,
    deleteUserUseCase,
    createAdminUseCase,
    updateAdminStatusUseCase,
    deleteAdminUseCase,
    updateAdminPermissionsUseCase,
  );

  return {
    userRepository,
    adminRepository,
    getDashboardStatsUseCase,
    getUsersUseCase,
    getAdminsUseCase,
    getUserByIdUseCase,
    updateUserRoleUseCase,
    updateAdminStatusUseCase,
    updateAdminPermissionsUseCase,
    createAdminUseCase,
    deleteUserUseCase,
    deleteAdminUseCase,
    requirePlatformRoleUseCase,
    getUserPermissionsUseCase,
    adminController,
  };
}
