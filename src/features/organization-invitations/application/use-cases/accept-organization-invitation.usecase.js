import { randomUUID } from "crypto";

import { AppError } from "../../../../common/errors/AppError.js";
import { User } from "../../../auth/entity/user.entity.js";
import { OrganizationMemberEntity } from "../../../organization-member/domain/entities/organization-member.entity.js";
import { InvitationStatus } from "../../domain/constants/invitation-status.js";

export class AcceptOrganizationInvitationUseCase {
  constructor({
    dataSource,
    userRepository,
    organizationRepository,
    organizationMemberRepository,
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
    workspaceMemberPermissionRepository,
    passwordService,
    rbacRepository,
  }) {
    this.dataSource = dataSource;
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationInvitationPermissionRepository =
      organizationInvitationPermissionRepository;
    this.workspaceMemberPermissionRepository =
      workspaceMemberPermissionRepository;
    this.passwordService = passwordService;
    this.rbacRepository = rbacRepository;
  }

  async execute({ token, name, password, userId }) {
    return this.dataSource.transaction(async (manager) => {
      const invitation =
        await this.organizationInvitationRepository.findByToken(token, manager);

      if (!invitation) {
        throw new AppError(
          "Invitation not found.",
          404,
          "INVITATION_NOT_FOUND",
        );
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new AppError(
          "Invitation is no longer valid.",
          400,
          "INVITATION_ALREADY_USED",
        );
      }

      if (invitation.isExpired()) {
        invitation.expire();

        await this.organizationInvitationRepository.update(invitation, manager);

        throw new AppError(
          "Invitation has expired.",
          400,
          "INVITATION_EXPIRED",
        );
      }

      const invitationPermissions =
        await this.organizationInvitationPermissionRepository.getPermissions(
          invitation.id,
          manager,
        );

      const permissionIds = invitationPermissions.map(
        (permission) => permission.id,
      );

      let user;

      if (userId) {
        user = await this.userRepository.findById(userId, manager);

        if (!user) {
          throw new AppError(
            "Authenticated user not found.",
            404,
            "USER_NOT_FOUND",
          );
        }

        if (
          user.email.trim().toLowerCase() !==
          invitation.email.trim().toLowerCase()
        ) {
          throw new AppError(
            "This invitation belongs to a different email address.",
            403,
            "INVITATION_EMAIL_MISMATCH",
          );
        }
      } else {
        user = await this.userRepository.findByEmail(invitation.email, manager);

        if (user) {
          throw new AppError(
            "This invitation requires you to sign in before accepting it.",
            401,
            "AUTHENTICATION_REQUIRED",
          );
        }

        if (!name || !password) {
          throw new AppError(
            "Name and password are required.",
            400,
            "USER_DETAILS_REQUIRED",
          );
        }

        const workspaceOwnerRole =
          await this.rbacRepository.getRoleByName("WORKSPACE_OWNER");

        if (!workspaceOwnerRole) {
          throw new AppError(
            "Workspace owner role not found.",
            500,
            "ROLE_NOT_FOUND",
          );
        }

        const passwordHash = await this.passwordService.hash(password);

        user = new User({
          id: randomUUID(),
          name,
          email: invitation.email,
          passwordHash,
          platformRole: "CUSTOMER",
          role: workspaceOwnerRole,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        user = await this.userRepository.create(user, manager);
      }

      let member =
        await this.organizationMemberRepository.findByOrganizationAndUserIncludingRemoved(
          invitation.organizationId,
          user.id,
          manager,
        );

      if (member) {
        if (member.status === "ACTIVE") {
          throw new AppError(
            "User already belongs to this organization.",
            409,
            "USER_ALREADY_MEMBER",
          );
        }

        member = await this.organizationMemberRepository.restore(
          member.id,
          invitation.role,
          invitation.createdBy,
          manager,
        );
      } else {
        member = new OrganizationMemberEntity({
          id: randomUUID(),
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          invitedBy: invitation.createdBy,
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        member = await this.organizationMemberRepository.create(
          member,
          manager,
        );
      }

      await this.workspaceMemberPermissionRepository.replacePermissions(
        member.id,
        permissionIds,
        manager,
      );

      if (invitation.role === "OWNER") {
        await this.organizationRepository.updateOwner(
          invitation.organizationId,
          user.id,
          manager,
        );
      }

      invitation.accept();

      await this.organizationInvitationRepository.update(invitation, manager);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        organization: {
          id: invitation.organizationId,
        },
        invitation: {
          status: invitation.status,
          acceptedAt: invitation.acceptedAt,
        },
        permissions: invitationPermissions.map(
          (permission) => permission.permissionKey,
        ),
      };
    });
  }
}
