import { OrganizationInvitationRepositoryImpl } from "./infrastructure/repositories/organization-invitation.repository.impl.js";
import { OrganizationInvitationPermissionRepositoryImpl } from "./infrastructure/repositories/organization-invitation-permission.repository.impl.js";
import { WorkspaceMemberPermissionRepositoryImpl } from "../workspace/members/infrastructure/repositories/workspace-member-permission.repository.impl.js";

import { CreateOrganizationInvitationUseCase } from "./application/use-cases/create-organization-invitation.usecase.js";
import { ValidateOrganizationInvitationUseCase } from "./application/use-cases/validate-organization-invitation.usecase.js";
import { AcceptOrganizationInvitationUseCase } from "./application/use-cases/accept-organization-invitation.usecase.js";

import { OrganizationInvitationController } from "./presentation/controllers/organization-invitation.controller.js";

export const createOrganizationInvitationModule = ({
  dataSource,
  organizationRepository,
  organizationMemberRepository,
  userRepository,
  passwordService,
  rbacRepository,
}) => {
  const organizationInvitationRepository =
    new OrganizationInvitationRepositoryImpl(dataSource);

  const organizationInvitationPermissionRepository =
    new OrganizationInvitationPermissionRepositoryImpl(dataSource);

  const workspaceMemberPermissionRepository =
    new WorkspaceMemberPermissionRepositoryImpl(dataSource);

  const createOrganizationInvitationUseCase =
    new CreateOrganizationInvitationUseCase({
      organizationRepository,
      organizationInvitationRepository,
    });

  const validateOrganizationInvitationUseCase =
    new ValidateOrganizationInvitationUseCase({
      organizationInvitationRepository,
      organizationRepository,
      userRepository,
    });

  const acceptOrganizationInvitationUseCase =
    new AcceptOrganizationInvitationUseCase({
      dataSource,
      userRepository,
      rbacRepository,
      organizationRepository,
      organizationMemberRepository,
      organizationInvitationRepository,
      organizationInvitationPermissionRepository,
      workspaceMemberPermissionRepository,
      passwordService,
    });

  const organizationInvitationController = new OrganizationInvitationController(
    createOrganizationInvitationUseCase,
    validateOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase,
  );

  return {
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
    workspaceMemberPermissionRepository,
    createOrganizationInvitationUseCase,
    validateOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase,
    organizationInvitationController,
  };
};
