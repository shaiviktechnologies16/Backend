export class GetDashboardStatsUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute() {
    return await this.adminRepository.getDashboardStats();
  }
}
