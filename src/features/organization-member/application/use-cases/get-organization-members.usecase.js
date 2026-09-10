import { AppError } from "../../../../common/errors/AppError.js";

export class GetOrganizationMembersUseCase {
  constructor(organizationRepository, organizationMemberRepository) {
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
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

    return await this.organizationMemberRepository.findAllByOrganization(
      organizationId,
    );
  }
}
