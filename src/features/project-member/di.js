import { AddProjectMemberUseCase } from "./application/use-cases/add-project-member.usecase.js";
import { GetProjectMembersUseCase } from "./application/use-cases/get-project-members.usecase.js";
import { UpdateProjectMemberRoleUseCase } from "./application/use-cases/update-project-member-role.usecase.js";
import { RemoveProjectMemberUseCase } from "./application/use-cases/remove-project-member.usecase.js";
import { RestoreProjectMemberUseCase } from "./application/use-cases/restore-project-member.usecase.js";
import { CheckProjectAccessUseCase } from "./application/use-cases/check-project-access.usecase.js";

import { ProjectMemberController } from "./presentation/controllers/project-member.controller.js";

export const createProjectMemberModule = ({
  projectRepository,
  projectMemberRepository,
  organizationMemberRepository,
}) => {
  const checkProjectAccessUseCase = new CheckProjectAccessUseCase(
    projectMemberRepository,
    projectRepository,
    organizationMemberRepository,
  );

  const addProjectMemberUseCase = new AddProjectMemberUseCase(
    projectMemberRepository,
    projectRepository,
    organizationMemberRepository,
    checkProjectAccessUseCase,
  );

  const getProjectMembersUseCase = new GetProjectMembersUseCase(
    projectMemberRepository,
    checkProjectAccessUseCase,
  );

  const updateProjectMemberRoleUseCase = new UpdateProjectMemberRoleUseCase(
    projectMemberRepository,
    checkProjectAccessUseCase,
  );

  const removeProjectMemberUseCase = new RemoveProjectMemberUseCase(
    projectMemberRepository,
    checkProjectAccessUseCase,
  );

  const restoreProjectMemberUseCase = new RestoreProjectMemberUseCase(
    projectMemberRepository,
    checkProjectAccessUseCase,
  );

  const projectMemberController = new ProjectMemberController(
    addProjectMemberUseCase,
    getProjectMembersUseCase,
    updateProjectMemberRoleUseCase,
    removeProjectMemberUseCase,
    restoreProjectMemberUseCase,
  );

  return {
    projectMemberRepository,
    addProjectMemberUseCase,
    getProjectMembersUseCase,
    updateProjectMemberRoleUseCase,
    removeProjectMemberUseCase,
    restoreProjectMemberUseCase,
    checkProjectAccessUseCase,
    projectMemberController,
  };
};
