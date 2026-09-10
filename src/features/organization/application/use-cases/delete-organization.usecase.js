import { AppError } from "../../../../common/errors/AppError.js";

export class DeleteOrganizationUseCase {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async execute(organizationId) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    await this.organizationRepository.delete(organization.id);

    return {
      message: "Organization deleted successfully.",
    };
  }
}
