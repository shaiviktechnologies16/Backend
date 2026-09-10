export class GetOrganizationFeatureAccessUseCase {
  constructor({ organizationFeatureAccessRepository }) {
    this.organizationFeatureAccessRepository =
      organizationFeatureAccessRepository;
  }

  async execute(organizationId) {
    return this.organizationFeatureAccessRepository.findByOrganizationId(
      organizationId,
    );
  }
}
