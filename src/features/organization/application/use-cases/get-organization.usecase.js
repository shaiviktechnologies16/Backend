import { AppError } from "../../../../common/errors/AppError.js";

export class GetOrganizationUseCase {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async execute(id) {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    return organization;
  }
}
