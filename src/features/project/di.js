import { ProjectService } from "./application/use-cases/project.service.js";
import { CreateProjectUseCase } from "./application/use-cases/create-project.usecase.js";

import { ProjectController } from "./presentation/controllers/project.controller.js";

export const createProjectModule = ({
  dataSource,
  projectRepository,
  organizationRepository,
  organizationMemberRepository,
  projectMemberRepository,
  checkProjectAccessUseCase,
}) => {
  const createProjectUseCase = new CreateProjectUseCase(
    dataSource,
    projectRepository,
    organizationRepository,
    organizationMemberRepository,
    projectMemberRepository,
  );

  const projectService = new ProjectService({
    projectRepository,
    projectMemberRepository,
    checkProjectAccessUseCase,
  });

  const projectController = new ProjectController({
    createProjectUseCase,
    projectService,
  });

  return {
    createProjectUseCase,
    projectService,
    projectController,
  };
};
