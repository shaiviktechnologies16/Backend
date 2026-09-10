export class GetOrganizationModelsUseCase {
  constructor({
    organizationModelAccessRepository,
    organizationModelEntitlementService = null,
  }) {
    this.organizationModelAccessRepository = organizationModelAccessRepository;
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
  }

  async execute(organizationId) {
    if (this.organizationModelEntitlementService) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId,
          },
        );
      } catch (err) {
        console.error(
          "Failed to auto-sync organization model entitlements in getOrganizationModelsUseCase:",
          err,
        );
      }
    }

    return this.organizationModelAccessRepository.findByOrganizationId(
      organizationId,
    );
  }
}
