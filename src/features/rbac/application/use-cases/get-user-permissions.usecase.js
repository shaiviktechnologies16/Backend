export class GetUserPermissionsUseCase {
  constructor(rbacRepository) {
    this.rbacRepository = rbacRepository;
  }

  async execute(userId) {
    return this.rbacRepository.getUserPermissions(userId);
  }
}
