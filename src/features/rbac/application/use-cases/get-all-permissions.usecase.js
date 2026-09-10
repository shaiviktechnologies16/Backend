export class GetAllPermissionsUseCase {
  constructor(rbacRepository) {
    this.rbacRepository = rbacRepository;
  }

  async execute() {
    return this.rbacRepository.getAllPermissions();
  }
}
