export class PermissionRepository {
  constructor(dataSource) {
    this.repository = dataSource.getRepository("Permission");
  }

  async findByKeys(permissionKeys) {
    return this.repository
      .createQueryBuilder("permission")
      .where("permission.permissionKey IN (:...keys)", {
        keys: permissionKeys,
      })
      .getMany();
  }

  async findAll() {
    return this.repository.find({
      order: {
        permissionKey: "ASC",
      },
    });
  }
}
