export class RbacRepository {
  async getRoleById(roleId) {
    throw new Error("getRoleById() not implemented");
  }

  async getRoleByName(name) {
    throw new Error("getRoleByName() not implemented");
  }

  async getPermissionsByRoleId(roleId) {
    throw new Error("getPermissionsByRoleId() not implemented");
  }

  async getUserPermissions(userId) {
    throw new Error("getUserPermissions() not implemented");
  }

  async getAllPermissions() {
    throw new Error("getAllPermissions() not implemented");
  }
}
