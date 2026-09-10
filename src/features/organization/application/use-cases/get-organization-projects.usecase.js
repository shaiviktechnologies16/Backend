export class GetOrganizationProjectsUseCase {
  constructor({ projectRepository }) {
    this.projectRepository = projectRepository;
  }

  async execute(organizationId) {
    return this.projectRepository.findByOrganizationId(organizationId);
  }
}
