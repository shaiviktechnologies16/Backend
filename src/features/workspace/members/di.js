import { WorkspaceMemberRepositoryImpl } from "./infrastructure/repositories/workspace-member.repository.impl.js";
import { WorkspaceMemberPermissionRepositoryImpl } from "./infrastructure/repositories/workspace-member-permission.repository.impl.js";
import { PermissionRepository } from "../../rbac/infrastructure/repositories/permission.repository.js";
import { GetMembersUseCase } from "./application/use-cases/get-members.usecase.js";
import { UpdateMemberRoleUseCase } from "./application/use-cases/update-member-role.usecase.js";
import { RemoveMemberUseCase } from "./application/use-cases/remove-member.usecase.js";
import { InviteMemberUseCase } from "./application/use-cases/invite-member.usecase.js";
import { RestoreMemberUseCase } from "./application/use-cases/restore-member.usecase.js";
import { UpdateMemberStatusUseCase } from "./application/use-cases/update-member-status.usecase.js";
import { WorkspaceMemberController } from "./presentation/controllers/workspace-member.controller.js";

export function createWorkspaceMemberModule({
  dataSource,
  userRepository,
  organizationRepository,
  organizationMemberRepository,
  organizationInvitationRepository,
  organizationInvitationPermissionRepository,
  contextMiddleware,
  emailService,
}) {
  const workspaceMemberRepository = new WorkspaceMemberRepositoryImpl(
    dataSource,
  );

  const workspaceMemberPermissionRepository =
    new WorkspaceMemberPermissionRepositoryImpl(dataSource);

  const permissionRepository = new PermissionRepository(dataSource);

  const getMembersUseCase = new GetMembersUseCase({
    workspaceMemberRepository,
  });

  const updateMemberRoleUseCase = new UpdateMemberRoleUseCase({
    workspaceMemberRepository,
  });

  const removeMemberUseCase = new RemoveMemberUseCase({
    workspaceMemberRepository,
  });

  const inviteMemberUseCase = new InviteMemberUseCase({
    userRepository,
    organizationRepository,
    organizationMemberRepository,
    organizationInvitationRepository,
    organizationInvitationPermissionRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
    emailService,
  });

  const restoreMemberUseCase = new RestoreMemberUseCase({
    workspaceMemberRepository,
  });

  const updateMemberStatusUseCase = new UpdateMemberStatusUseCase({
    workspaceMemberRepository,
    userRepository,
  });
  const workspaceMemberController = new WorkspaceMemberController({
    getMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    inviteMemberUseCase,
    restoreMemberUseCase,
    updateMemberStatusUseCase,
  });

  return {
    workspaceMemberRepository,
    workspaceMemberPermissionRepository,
    permissionRepository,
    getMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    inviteMemberUseCase,
    restoreMemberUseCase,
    updateMemberStatusUseCase,
    workspaceMemberController,
    contextMiddleware,
  };
}
