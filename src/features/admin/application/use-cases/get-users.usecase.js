export class GetUsersUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute(query) {
    return this.adminRepository.getUsers(query);
  }
}
