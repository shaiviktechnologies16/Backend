import crypto from "crypto";

import { AppError } from "../../../../common/errors/AppError.js";
import { generateSlug } from "../../../../common/utils/slug.js";

import { OrganizationRole } from "../../domain/constants/organization-role.js";
import { OrganizationStatus } from "../../domain/constants/organization-status.js";
import { OrganizationEntity } from "../../domain/entities/organization.entity.js";
import envConfig from "../../../../config/env.config.js";
import { OrganizationInvitationEntity } from "../../../organization-invitations/domain/entities/organization-invitation.entity.js";
import { InvitationStatus } from "../../../organization-invitations/domain/constants/invitation-status.js";

export class CreateOrganizationUseCase {
  constructor({
    dataSource,
    organizationRepository,
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
    permissionRepository,
    companyProfileRepository,
    workspaceSettingsRepository,
    userRepository,
    emailService,
    planRepository,
    organizationModelEntitlementService,
  }) {
    this.dataSource = dataSource;
    this.organizationRepository = organizationRepository;
    this.organizationInvitationRepository = organizationInvitationRepository;
    this.organizationInvitationPermissionRepository =
      organizationInvitationPermissionRepository;
    this.permissionRepository = permissionRepository;
    this.companyProfileRepository = companyProfileRepository;
    this.workspaceSettingsRepository = workspaceSettingsRepository;
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.planRepository = planRepository;
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
  }

  async execute({
    name,
    ownerEmail,
    logo = null,
    website = null,
    description = null,
    ownerId,
    createdBy,
    permissions = [],
  }) {
    if (!permissions.length) {
      throw new AppError(
        "At least one permission must be selected.",
        400,
        "PERMISSIONS_REQUIRED",
      );
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const email = ownerEmail.trim().toLowerCase();

      const existingUser = await this.userRepository.findByEmail(
        email,
        manager,
      );

      if (existingUser) {
        throw new AppError(
          "A user already exists with this email.",
          409,
          "USER_EMAIL_ALREADY_EXISTS",
        );
      }

      const existingInvitation =
        await this.organizationInvitationRepository.findByEmail(email, manager);

      if (existingInvitation) {
        throw new AppError(
          "This owner email is already assigned to another organization.",
          409,
          "OWNER_EMAIL_ALREADY_EXISTS",
        );
      }

      const baseSlug = generateSlug(name);

      let slug = baseSlug;
      let counter = 1;

      while (await this.organizationRepository.findBySlug(slug, manager)) {
        slug = `${baseSlug}-${counter++}`;
      }

      let freePlan = await this.planRepository.findByCode("FREE");

      if (!freePlan) {
        const allPlans = await this.planRepository.findAll();
        freePlan =
          allPlans.find((p) => p.isDefault || p.isDefault === true) ||
          allPlans[0];
      }

      if (!freePlan) {
        throw new AppError(
          "Default FREE plan is not configured.",
          500,
          "DEFAULT_PLAN_NOT_CONFIGURED",
        );
      }

      const organization = new OrganizationEntity({
        name,
        slug,
        ownerId: null,
        planId: freePlan.id,
        logo,
        website,
        description,
        status: OrganizationStatus.ACTIVE,
      });

      const createdOrganization = await this.organizationRepository.create(
        organization,
        manager,
      );

      await manager.query(
        `INSERT INTO subscriptions (organization_id, plan_id, status, billing_interval, current_period_start, current_period_end)
         VALUES ($1, $2, 'ACTIVE', 'MONTHLY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')
         ON CONFLICT (organization_id) DO UPDATE SET plan_id = $2, current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month'`,
        [createdOrganization.id, freePlan.id],
      );

      if (this.organizationModelEntitlementService) {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId: createdOrganization.id,
            planCode: freePlan.code,
            runner: manager,
          },
        );
      }

      await this.companyProfileRepository.create(
        {
          organizationId: createdOrganization.id,
          companyName: createdOrganization.name,
          logo: createdOrganization.logo,
          website: createdOrganization.website,
          description: createdOrganization.description,
        },
        manager,
      );

      await this.workspaceSettingsRepository.create(
        {
          organizationId: createdOrganization.id,
          assistantName: "AI Assistant",
          assistantDescription: null,
          systemPrompt: null,
          themeConfig: {},
          featureFlags: {},
        },
        manager,
      );

      const invitation = new OrganizationInvitationEntity({
        organizationId: createdOrganization.id,
        email,
        role: OrganizationRole.OWNER,
        token: crypto.randomBytes(32).toString("hex"),
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy,
      });

      const createdInvitation =
        await this.organizationInvitationRepository.create(invitation, manager);
      const permissionEntities =
        await this.permissionRepository.findByKeys(permissions);

      if (permissionEntities.length !== permissions.length) {
        throw new AppError(
          "One or more permissions are invalid.",
          400,
          "INVALID_PERMISSIONS",
        );
      }

      await this.organizationInvitationPermissionRepository.replacePermissions(
        createdInvitation.id,
        permissionEntities.map((permission) => permission.id),
        manager,
      );

      return {
        organization: createdOrganization,
        invitation: createdInvitation,
        email,
      };
    });

    try {
      const inviter = await this.userRepository.findById(createdBy);

      await this.emailService.sendOrganizationInvitation({
        email: result.email,
        organizationName: result.organization.name,
        inviterName: envConfig.platform.name,
        invitationToken: result.invitation.token,
        role: OrganizationRole.OWNER,
      });
    } catch (error) {
      console.error("Failed to send organization invitation email:", error);
    }

    return result.organization;
  }
}
