import { AppDataSource } from "../../database/datasource.js";
import { OrganizationRepositoryImpl } from "../organization/infrastructure/repositories/organization.repository.impl.js";
import { OrganizationMemberRepositoryImpl } from "./infrastructure/repositories/organization-member.repository.impl.js";
import { EnquiryNotificationRecipientRepositoryImpl } from "./infrastructure/repositories/enquiry-notification-recipient.repository.impl.js";
import { WorkspaceMemberPermissionRepositoryImpl } from "../workspace/members/infrastructure/repositories/workspace-member-permission.repository.impl.js";
import { PermissionRepository } from "../rbac/infrastructure/repositories/permission.repository.js";
import { AddMemberUseCase } from "./application/use-cases/add-member.usecase.js";
import { GetOrganizationMembersUseCase } from "./application/use-cases/get-organization-members.usecase.js";
import { UpdateMemberRoleUseCase } from "./application/use-cases/update-member-role.usecase.js";
import { RemoveMemberUseCase } from "./application/use-cases/remove-member.usecase.js";
import { GetMemberPermissionsUseCase } from "./application/use-cases/get-member-permissions.usecase.js";
import { UpdateMemberPermissionsUseCase } from "./application/use-cases/update-member-permissions.usecase.js";
import { GetEnquiryNotificationRecipientsUseCase } from "./application/use-cases/get-enquiry-notification-recipients.usecase.js";
import { UpdateEnquiryNotificationRecipientsUseCase } from "./application/use-cases/update-enquiry-notification-recipients.usecase.js";
import { OrganizationMemberController } from "./presentation/controllers/organization-member.controller.js";
import { PostgresUserRepository } from "../auth/repository/postgres/postgres-user.repository.js";

export const createOrganizationMemberModule = () => {
  const userRepository = new PostgresUserRepository(AppDataSource);

  const organizationRepository = new OrganizationRepositoryImpl(AppDataSource);

  const organizationMemberRepository = new OrganizationMemberRepositoryImpl(
    AppDataSource,
  );

  const enquiryNotificationRecipientRepository =
    new EnquiryNotificationRecipientRepositoryImpl(AppDataSource);

  const workspaceMemberPermissionRepository =
    new WorkspaceMemberPermissionRepositoryImpl(AppDataSource);

  const permissionRepository = new PermissionRepository(AppDataSource);

  const addMemberUseCase = new AddMemberUseCase(
    organizationRepository,
    organizationMemberRepository,
    userRepository,
  );

  const getOrganizationMembersUseCase = new GetOrganizationMembersUseCase(
    organizationRepository,
    organizationMemberRepository,
  );

  const updateMemberRoleUseCase = new UpdateMemberRoleUseCase(
    organizationRepository,
    organizationMemberRepository,
  );

  const removeMemberUseCase = new RemoveMemberUseCase(
    organizationMemberRepository,
  );

  const getMemberPermissionsUseCase = new GetMemberPermissionsUseCase(
    organizationRepository,
    organizationMemberRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
  );

  const updateMemberPermissionsUseCase = new UpdateMemberPermissionsUseCase(
    organizationRepository,
    organizationMemberRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
  );
  const getEnquiryNotificationRecipientsUseCase =
    new GetEnquiryNotificationRecipientsUseCase({
      organizationMemberRepository,
      enquiryNotificationRecipientRepository,
    });

  const updateEnquiryNotificationRecipientsUseCase =
    new UpdateEnquiryNotificationRecipientsUseCase({
      organizationMemberRepository,
      enquiryNotificationRecipientRepository,
    });

  const organizationMemberController = new OrganizationMemberController(
    addMemberUseCase,
    getOrganizationMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    getMemberPermissionsUseCase,
    updateMemberPermissionsUseCase,
    getEnquiryNotificationRecipientsUseCase,
    updateEnquiryNotificationRecipientsUseCase,
  );

  return {
    organizationRepository,
    organizationMemberRepository,
    enquiryNotificationRecipientRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
    userRepository,

    addMemberUseCase,
    getOrganizationMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    getMemberPermissionsUseCase,
    updateMemberPermissionsUseCase,

    getEnquiryNotificationRecipientsUseCase,
    updateEnquiryNotificationRecipientsUseCase,

    organizationMemberController,
  };
};
