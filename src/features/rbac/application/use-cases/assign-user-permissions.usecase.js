export class AssignUserPermissionsUseCase {
  constructor({ permissionRepository, userPermissionRepository }) {
    this.permissionRepository = permissionRepository;
    this.userPermissionRepository = userPermissionRepository;
  }

  async execute({ userId, permissions = [] }) {
    if (!permissions.length) {
      return;
    }

    const permissionEntities =
      await this.permissionRepository.findByKeys(permissions);

    if (!permissionEntities.length) {
      return;
    }

    const permissionIds = permissionEntities.map((permission) => permission.id);

    await this.userPermissionRepository.createMany(userId, permissionIds);
  }
}
