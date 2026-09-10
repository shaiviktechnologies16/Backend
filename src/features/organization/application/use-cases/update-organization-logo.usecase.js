import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateOrganizationLogoUseCase {
  constructor({ organizationRepository }) {
    this.organizationRepository = organizationRepository;
  }

  async execute({ organizationId, logo }) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    return this.organizationRepository.update(organizationId, {
      logo,
    });
  }
}
