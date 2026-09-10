import { ProjectContextEntity } from "../../domain/entities/project-context.entity.js";
import { ContextErrors } from "../../domain/constants/context-errors.js";
import { AppError } from "../../../../../common/errors/AppError.js";

export class ResolveProjectContextUseCase {
  constructor({ projectRepository, projectMemberRepository }) {
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
  }

  async execute(userId, projectId, organizationId) {
    const membership = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (!membership) {
      throw new AppError(
        "Project access denied.",
        403,
        ContextErrors.PROJECT_CONTEXT_NOT_FOUND,
      );
    }

    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError(
        "Project not found.",
        404,
        ContextErrors.PROJECT_CONTEXT_NOT_FOUND,
      );
    }

    if (organizationId && project.organizationId !== organizationId) {
      throw new AppError(
        "Project does not belong to this organization.",
        403,
        ContextErrors.PROJECT_CONTEXT_NOT_FOUND,
      );
    }

    return new ProjectContextEntity({
      id: project.id,
      name: project.name,
      status: project.status,
      organizationId: project.organizationId,
      role: membership.role,
    });
  }
}
