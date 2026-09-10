export class UpdateOrganizationFeatureAccessUseCase {
  constructor({ organizationFeatureAccessRepository }) {
    this.organizationFeatureAccessRepository =
      organizationFeatureAccessRepository;
  }

  async execute({ organizationId, feature, enabled }) {
    return this.organizationFeatureAccessRepository.upsert(
      organizationId,
      feature,
      enabled,
    );
  }
}
