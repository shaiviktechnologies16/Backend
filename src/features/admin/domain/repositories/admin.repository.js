export class AdminRepository {
  async getDashboardStats() {
    throw new Error("Not implemented");
  }

  async getUsers(query) {
    throw new Error("Not implemented");
  }

  async getUserById(id) {
    throw new Error("Not implemented");
  }

  async updatePlatformRole(id, platformRole) {
    throw new Error("Not implemented");
  }
  async updateAdminStatus({ userId, isActive }) {
    throw new Error("updateAdminStatus() not implemented");
  }
  async deleteAdmin(userId) {
    throw new Error("deleteAdmin() not implemented");
  }
}
