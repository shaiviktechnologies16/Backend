import { InvitationStatus } from "../../domain/constants/invitation-status.js";

export class ValidateOrganizationInvitationUseCase {
  constructor({
    organizationInvitationRepository,
    organizationRepository,
    userRepository,
  }) {
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationRepository = organizationRepository;
    this.userRepository = userRepository;
  }

  async execute(token) {
    const invitation =
      await this.organizationInvitationRepository.findByToken(token);

    if (!invitation) {
      throw new Error("Invitation not found.");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error("Invitation is no longer valid.");
    }

    if (invitation.isExpired()) {
      invitation.expire();

      await this.organizationInvitationRepository.update(invitation);

      throw new Error("Invitation has expired.");
    }

    const organization = await this.organizationRepository.findById(
      invitation.organizationId,
    );

    if (!organization) {
      throw new Error("Organization not found.");
    }

    const existingUser = await this.userRepository.findByEmail(
      invitation.email,
    );

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
      },
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        isExistingUser: Boolean(existingUser),
      },
    };
  }
}
