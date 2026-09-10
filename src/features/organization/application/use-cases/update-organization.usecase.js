import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateOrganizationUseCase {
  constructor(organizationRepository) {
    this.organizationRepository = organizationRepository;
  }

  async execute(id, payload) {
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    const updateData = {
      name: payload.name ?? organization.name,
      logo: payload.logo ?? organization.logo,
      website: payload.website ?? organization.website,
      description: payload.description ?? organization.description,
      ownerId: payload.ownerId ?? organization.ownerId,
      status: payload.status ?? organization.status,
    };

    return await this.organizationRepository.update(id, updateData);
  }
}
