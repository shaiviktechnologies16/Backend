export class GetRolePermissionsUseCase {
  constructor(rbacRepository) {
    this.rbacRepository = rbacRepository;
  }

  async execute(roleId) {
    return this.rbacRepository.getPermissionsByRoleId(roleId);
  }
}
