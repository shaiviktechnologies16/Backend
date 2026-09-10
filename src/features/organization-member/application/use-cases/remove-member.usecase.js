export class RemoveMemberUseCase {
  constructor(organizationMemberRepository) {
    this.organizationMemberRepository = organizationMemberRepository;
  }

  async execute({ organizationId, userId }) {
    const member =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

    if (!member) {
      throw new AppError(
        "Organization member not found.",
        404,
        "MEMBER_NOT_FOUND",
      );
    }

    if (member.role === "OWNER") {
      throw new AppError(
        "Organization owner cannot be removed.",
        400,
        "OWNER_REMOVE_NOT_ALLOWED",
      );
    }

    await this.organizationMemberRepository.delete(member.id);

    return {
      message: "Member removed successfully.",
    };
  }
}
