import crypto from "crypto";

import { OrganizationInvitationEntity } from "../../domain/entities/organization-invitation.entity.js";
import { InvitationStatus } from "../../domain/constants/invitation-status.js";

export class CreateOrganizationInvitationUseCase {
  constructor({
    organizationRepository,
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
  }) {
    this.organizationRepository = organizationRepository;
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationInvitationPermissionRepository =
      organizationInvitationPermissionRepository;
  }

  async execute({
    organizationId,
    email,
    role,
    createdBy,
    permissionIds = [],
  }) {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error("Organization not found.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingInvitation =
      await this.organizationInvitationRepository.findPendingByOrganizationAndEmail(
        organizationId,
        normalizedEmail,
      );

    if (existingInvitation) {
      throw new Error("A pending invitation already exists for this email.");
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invitation = new OrganizationInvitationEntity({
      organizationId,
      email: normalizedEmail,
      role,
      token,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy,
    });

    const createdInvitation =
      await this.organizationInvitationRepository.create(invitation);

    if (permissionIds.length > 0) {
      await this.organizationInvitationPermissionRepository.replacePermissions(
        createdInvitation.id,
        permissionIds,
      );
    }

    return createdInvitation;
  }
}
