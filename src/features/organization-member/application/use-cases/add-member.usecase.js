import { AppError } from "../../../../common/errors/AppError.js";
import { OrganizationMemberEntity } from "../../domain/entities/organization-member.entity.js";
import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class AddMemberUseCase {
  constructor(
    organizationRepository,
    organizationMemberRepository,
    userRepository,
  ) {
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.userRepository = userRepository;
  }

  async execute({
    organizationId,
    email,
    role = OrganizationRole.MEMBER,
    invitedBy,
  }) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new AppError("Email is required.", 400, "EMAIL_REQUIRED");
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError(
        "User with this email was not found.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const existingMember =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organization.id,
        user.id,
      );

    if (existingMember) {
      throw new AppError(
        "User is already a member of this organization.",
        409,
        "MEMBER_ALREADY_EXISTS",
      );
    }

    const member = new OrganizationMemberEntity({
      organizationId: organization.id,
      userId: user.id,
      role,
      invitedBy,
      joinedAt: new Date(),
    });

    return await this.organizationMemberRepository.create(member);
  }
}
