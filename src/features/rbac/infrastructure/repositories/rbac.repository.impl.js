import { RbacRepository } from "../../domain/repositories/rbac.repository.js";

export class RbacRepositoryImpl extends RbacRepository {
  constructor(rbacDataSource) {
    super();

    this.rbacDataSource = rbacDataSource;
  }

  async getRoleById(roleId) {
    return this.rbacDataSource.getRoleById(roleId);
  }

  async getRoleByName(name) {
    return this.rbacDataSource.getRoleByName(name);
  }

  async getPermissionsByRoleId(roleId) {
    return this.rbacDataSource.getPermissionsByRoleId(roleId);
  }

  async getUserPermissions(userId) {
    return this.rbacDataSource.getUserPermissions(userId);
  }

  async getAllPermissions() {
    return this.rbacDataSource.getAllPermissions();
  }
}
