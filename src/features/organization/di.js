import { AppDataSource } from "../../database/datasource.js";

import { OrganizationRepositoryImpl } from "./infrastructure/repositories/organization.repository.impl.js";

import { CreateOrganizationUseCase } from "./application/use-cases/create-organization.usecase.js";
import { GetOrganizationUseCase } from "./application/use-cases/get-organization.usecase.js";
import { GetOrganizationsUseCase } from "./application/use-cases/get-organizations.usecase.js";
import { UpdateOrganizationUseCase } from "./application/use-cases/update-organization.usecase.js";
import { DeleteOrganizationUseCase } from "./application/use-cases/delete-organization.usecase.js";
import { UpdateOrganizationLogoUseCase } from "./application/use-cases/update-organization-logo.usecase.js";
import { GetOrganizationProjectsUseCase } from "./application/use-cases/get-organization-projects.usecase.js";
import { GetPublicOrganizationUseCase } from "./application/use-cases/get-public-organization.usecase.js";

import { ProjectRepositoryImpl } from "../project/infrastructure/repositories/project.repository.impl.js";
import { PermissionRepository } from "../rbac/infrastructure/repositories/permission.repository.js";
import { PlanRepositoryImpl } from "../platform/plans/infrastructure/repositories/plan.repository.impl.js";
import { OrganizationMemberRepositoryImpl } from "../organization-member/infrastructure/repositories/organization-member.repository.impl.js";

import { OrganizationController } from "./presentation/controllers/organization.controller.js";

export const createOrganizationModule = ({
  companyProfileRepository,
  workspaceSettingsRepository,
  userRepository,
  emailService,
  uploadFileUseCase,
  organizationInvitationRepository,
  organizationInvitationPermissionRepository,
  organizationModelEntitlementService,
}) => {
  const organizationRepository = new OrganizationRepositoryImpl(AppDataSource);

  const organizationMemberRepository = new OrganizationMemberRepositoryImpl(
    AppDataSource,
  );

  const getPublicOrganizationUseCase = new GetPublicOrganizationUseCase({
    organizationRepository,
    companyProfileRepository,
  });

  const planRepository = new PlanRepositoryImpl(AppDataSource);

  const permissionRepository = new PermissionRepository(AppDataSource);

  const createOrganizationUseCase = new CreateOrganizationUseCase({
    dataSource: AppDataSource,
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
  });

  const getOrganizationsUseCase = new GetOrganizationsUseCase(
    organizationRepository,
  );

  const getOrganizationUseCase = new GetOrganizationUseCase(
    organizationRepository,
  );

  const projectRepository = new ProjectRepositoryImpl(AppDataSource);

  const getOrganizationProjectsUseCase = new GetOrganizationProjectsUseCase({
    projectRepository,
  });

  const updateOrganizationUseCase = new UpdateOrganizationUseCase(
    organizationRepository,
  );

  const deleteOrganizationUseCase = new DeleteOrganizationUseCase(
    organizationRepository,
  );

  const updateOrganizationLogoUseCase = new UpdateOrganizationLogoUseCase({
    organizationRepository,
  });

  const organizationController = new OrganizationController({
    createOrganizationUseCase,
    getOrganizationsUseCase,
    getOrganizationUseCase,
    getPublicOrganizationUseCase,
    getOrganizationProjectsUseCase,
    updateOrganizationUseCase,
    deleteOrganizationUseCase,
    updateOrganizationLogoUseCase,
    uploadFileUseCase,
  });

  return {
    organizationRepository,
    organizationMemberRepository,
    createOrganizationUseCase,
    getOrganizationsUseCase,
    getOrganizationUseCase,
    getPublicOrganizationUseCase,
    getOrganizationProjectsUseCase,
    updateOrganizationUseCase,
    deleteOrganizationUseCase,
    updateOrganizationLogoUseCase,
    organizationController,
  };
};
