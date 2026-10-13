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
    let existing =
      await this.organizationModelAccessRepository.findByOrganizationId(
        organizationId,
      );

    // If the organization currently has zero assigned models, seed default plan models once
    if (
      (!existing || existing.length === 0) &&
      this.organizationModelEntitlementService
    ) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId,
          },
        );
        existing =
          await this.organizationModelAccessRepository.findByOrganizationId(
            organizationId,
          );
      } catch (err) {
        console.error(
          "Failed to auto-seed organization model entitlements in getOrganizationModelsUseCase:",
          err,
        );
      }
    }

    return existing;
  }
}
