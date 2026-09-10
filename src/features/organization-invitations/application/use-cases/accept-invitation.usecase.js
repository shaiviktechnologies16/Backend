import { AppError } from "../../../../common/errors/AppError.js";

import { UserEntity } from "../../../auth/domain/entities/user.entity.js";

import { OrganizationMemberEntity } from "../../../organization-member/domain/entities/organization-member.entity.js";

import { InvitationStatus } from "../constants/invitation-status.js";

import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class AcceptInvitationUseCase {
  constructor({
    dataSource,
    userRepository,
    organizationRepository,
    organizationInvitationRepository,
    organizationMemberRepository,
    passwordService,
  }) {
    this.dataSource = dataSource;
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.passwordService = passwordService;
  }

  async execute({ token, name, password }) {
    return this.dataSource.transaction(async (manager) => {
      const invitation =
        await this.organizationInvitationRepository.findByToken(token, manager);

      if (!invitation) {
        throw new AppError("Invalid invitation.", 404, "INVITATION_NOT_FOUND");
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(
          "Invitation already processed.",
          400,
          "INVITATION_ALREADY_USED",
        );
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new AppError("Invitation expired.", 400, "INVITATION_EXPIRED");
      }

      let user = await this.userRepository.findByEmail(
        invitation.email,
        manager,
      );

      console.log("ACCEPT INVITATION - USER:", user);

      if (!user) {
        console.log("ACCEPT INVITATION - NEW USER FLOW");

        if (!name || !password) {
          throw new AppError(
            "Name and password are required.",
            400,
            "USER_DETAILS_REQUIRED",
          );
        }

        const passwordHash = await this.passwordService.hash(password);

        user = await this.userRepository.create(
          new UserEntity({
            name,
            email: invitation.email,
            passwordHash,
            isActive: true,
          }),
          manager,
        );
      }

      const existingMember =
        await this.organizationMemberRepository.findByOrganizationAndUserIncludingRemoved(
          invitation.organizationId,
          user.id,
          manager,
        );

      if (!existingMember) {
        const member = new OrganizationMemberEntity({
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role || OrganizationRole.MEMBER,
          invitedBy: invitation.createdBy,
          joinedAt: new Date(),
        });

        await this.organizationMemberRepository.create(member, manager);
      }
      console.log("ACCEPT INVITATION - EXISTING USER:", user.id);

      if (invitation.role === OrganizationRole.OWNER) {
        await this.organizationRepository.updateOwner(
          invitation.organizationId,
          user.id,
          manager,
        );
      }

      await this.organizationInvitationRepository.markAccepted(
        invitation.id,
        manager,
      );

      return {
        message: "Invitation accepted successfully.",
      };
    });
  }
}
