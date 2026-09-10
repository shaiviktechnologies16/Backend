export class GetOrganizationsUseCase {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async execute() {
    return await this.organizationRepository.findAllWithCounts();
  }
}
