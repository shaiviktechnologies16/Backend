export class AdminAuthRepository {
  /**
   * Find an admin by email.
   * @param {string} email
   * @returns {Promise<import("../entities/admin.entity.js").AdminEntity|null>}
   */
  async findByEmail(email) {
    throw new Error("findByEmail() not implemented.");
  }

  /**
   * Find admin by id.
   * @param {string} id
   * @returns {Promise<import("../entities/admin.entity.js").AdminEntity|null>}
   */
  async findById(id) {
    throw new Error("findById() not implemented.");
  }

  /**
   * Find existing super admin.
   * Used for first-time platform bootstrap.
   *
   * @returns {Promise<import("../entities/admin.entity.js").AdminEntity|null>}
   */
  async findSuperAdmin() {
    throw new Error("findSuperAdmin() not implemented.");
  }

  /**
   * Create admin user.
   *
   * @param {import("../entities/admin.entity.js").AdminEntity} admin
   * @returns {Promise<import("../entities/admin.entity.js").AdminEntity>}
   */
  async createAdmin(admin) {
    throw new Error("createAdmin() not implemented.");
  }

  /**
   * Save refresh token.
   * @param {string} userId
   * @param {string} refreshToken
   */
  async updateRefreshToken(userId, refreshToken) {
    throw new Error("updateRefreshToken() not implemented.");
  }

  /**
   * Remove refresh token.
   * @param {string} userId
   */
  async updatePassword(userId, passwordHash) {
    throw new Error("Not implemented");
  }

  async clearRefreshToken(userId) {
    throw new Error("clearRefreshToken() not implemented.");
  }
}
