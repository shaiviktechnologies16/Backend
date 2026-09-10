export class UserPermissionRepository {
  constructor(dataSource) {
    this.repository = dataSource.getRepository("UserPermission");
  }

  async createMany(userId, permissionIds) {
    const records = permissionIds.map((permissionId) => ({
      user: {
        id: userId,
      },
      permission: {
        id: permissionId,
      },
    }));

    await this.repository.save(records);
  }

  async deleteByUserId(userId) {
    await this.repository.delete({
      user: {
        id: userId,
      },
    });
  }

  async getUserPermissions(userId) {
    return this.repository.find({
      where: {
        user: {
          id: userId,
        },
      },
      relations: {
        permission: true,
      },
    });
  }
}
