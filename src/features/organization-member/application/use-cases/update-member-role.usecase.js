import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateMemberRoleUseCase {
  constructor(organizationRepository, organizationMemberRepository) {
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
  }

  async execute({ ownerId, userId, role }) {
    const organization =
      await this.organizationRepository.findByOwnerId(ownerId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    if (organization.ownerId === userId) {
      throw new AppError("Organization owner's role cannot be updated.", 400);
    }

    const member =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organization.id,
        userId,
      );

    if (!member) {
      throw new AppError("Organization member not found.", 404);
    }

    if (member.role === role) {
      throw new AppError("Member already has the selected role.", 409);
    }

    return await this.organizationMemberRepository.updateRole(member.id, role);
  }
}
