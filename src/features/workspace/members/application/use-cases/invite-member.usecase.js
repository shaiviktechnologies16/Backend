import crypto from "crypto";

import { AppError } from "../../../../../common/errors/AppError.js";

import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";
import { OrganizationMemberEntity } from "../../../../organization-member/domain/entities/organization-member.entity.js";
import { PlatformRole } from "../../../../admin/domain/constants/platform-role.js";

export class InviteMemberUseCase {
  constructor({
    userRepository,
    organizationRepository,
    organizationMemberRepository,
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
    emailService,
  }) {
    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationInvitationPermissionRepository =
      organizationInvitationPermissionRepository;
    this.workspaceMemberPermissionRepository =
      workspaceMemberPermissionRepository;
    this.permissionRepository = permissionRepository;
    this.emailService = emailService;
  }

  async execute({ organizationId, email, role, permissions = [], invitedBy }) {
    const allowedRoles = [OrganizationRole.ADMIN, OrganizationRole.MEMBER];

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Invalid organization role.",
        400,
        "INVALID_ORGANIZATION_ROLE",
      );
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new AppError("Email is required.", 400, "EMAIL_REQUIRED");
    }

    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    const inviter = await this.userRepository.findById(invitedBy);

    if (!inviter) {
      throw new AppError("Inviter not found.", 404, "INVITER_NOT_FOUND");
    }

    const uniquePermissions = [...new Set(permissions)];

    const permissionEntities =
      await this.permissionRepository.findByKeys(uniquePermissions);

    if (permissionEntities.length !== uniquePermissions.length) {
      throw new AppError(
        "One or more permissions are invalid.",
        400,
        "INVALID_PERMISSIONS",
      );
    }

    const permissionIds = permissionEntities.map((permission) => permission.id);

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      const isPlatformUser =
        existingUser.platformRole === PlatformRole.PLATFORM_ADMIN ||
        existingUser.platformRole === PlatformRole.PLATFORM_MANAGER;

      if (isPlatformUser) {
        throw new AppError(
          "Platform users cannot be added as organization members.",
          403,
          "PLATFORM_USER_NOT_ALLOWED",
        );
      }

      const existingMember =
        await this.organizationMemberRepository.findByOrganizationAndUserIncludingRemoved(
          organizationId,
          existingUser.id,
        );

      if (existingMember?.status === "ACTIVE") {
        throw new AppError(
          "User already belongs to this organization.",
          409,
          "USER_ALREADY_MEMBER",
        );
      }

      const existingInvitation =
        await this.organizationInvitationRepository.findPendingByOrganizationAndEmail(
          organizationId,
          normalizedEmail,
        );

      if (existingInvitation) {
        throw new AppError(
          "An invitation has already been sent to this email.",
          409,
          "INVITATION_ALREADY_EXISTS",
        );
      }

      const invitation = await this.createInvitation({
        organizationId,
        email: normalizedEmail,
        role,
        invitedBy,
      });

      await this.organizationInvitationPermissionRepository.replacePermissions(
        invitation.id,
        permissionIds,
      );

      await this.emailService.sendOrganizationInvitation({
        email: normalizedEmail,
        organizationName: organization.name,
        inviterName: inviter.name,
        invitationToken: invitation.token,
        role,
      });

      return {
        ...invitation,
        permissions: uniquePermissions,
        isExistingUser: true,
      };
    }
    const existingInvitation =
      await this.organizationInvitationRepository.findPendingByOrganizationAndEmail(
        organizationId,
        normalizedEmail,
      );

    if (existingInvitation) {
      throw new AppError(
        "An invitation has already been sent to this email.",
        409,
        "INVITATION_ALREADY_EXISTS",
      );
    }

    const invitation = await this.createInvitation({
      organizationId,
      email: normalizedEmail,
      role,
      invitedBy,
    });

    await this.organizationInvitationPermissionRepository.replacePermissions(
      invitation.id,
      permissionIds,
    );

    this.emailService.sendOrganizationInvitation({
      email: normalizedEmail,
      organizationName: organization.name,
      inviterName: inviter.name,
      invitationToken: invitation.token,
      role,
    });

    return {
      ...invitation,
      permissions: uniquePermissions,
      isExistingUser: false,
    };
  }

  async createInvitation({ organizationId, email, role, invitedBy }) {
    return this.organizationInvitationRepository.create({
      organizationId,
      email,
      role,
      token: crypto.randomBytes(32).toString("hex"),
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: invitedBy,
    });
  }
}
