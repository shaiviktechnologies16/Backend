import { AppDataSource } from "../../../../database/datasource.js";

export class RbacDataSource {
  constructor() {
    this.roleRepository = AppDataSource.getRepository("Role");
    this.permissionRepository = AppDataSource.getRepository("Permission");

    this.rolePermissionRepository =
      AppDataSource.getRepository("RolePermission");

    this.userPermissionRepository =
      AppDataSource.getRepository("UserPermission");

    this.userRepository = AppDataSource.getRepository("User");
  }

  async getRoleById(roleId) {
    return this.roleRepository.findOne({
      where: {
        id: roleId,
      },
    });
  }

  async getRoleByName(name) {
    return this.roleRepository.findOne({
      where: {
        name,
      },
    });
  }

  async getPermissionsByRoleId(roleId) {
    const records = await this.rolePermissionRepository.find({
      where: {
        role: {
          id: roleId,
        },
      },
      relations: {
        permission: true,
      },
    });

    return records.map((record) => record.permission);
  }

  async getUserPermissions(userId) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        role: true,
      },
    });

    if (!user) {
      return [];
    }

    const rolePermissions = user.role
      ? await this.getPermissionsByRoleId(user.role.id)
      : [];

    const userPermissions = await this.userPermissionRepository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        permission: true,
      },
    });

    const permissions = [
      ...rolePermissions,
      ...userPermissions.map((item) => item.permission),
    ];

    return [
      ...new Map(
        permissions.map((permission) => [
          permission.permissionKey,
          permission,
        ]),
      ).values(),
    ];
  }

  async getAllPermissions() {
    return this.permissionRepository.find({
      order: {
        permissionKey: "ASC",
      },
    });
  }
}
