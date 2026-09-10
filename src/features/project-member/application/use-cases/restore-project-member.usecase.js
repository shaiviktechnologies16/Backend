import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";

export class RestoreProjectMemberUseCase {
  constructor(projectMemberRepository, checkProjectAccessUseCase) {
    this.projectMemberRepository = projectMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ id, requesterId }) {
    const member =
      await this.projectMemberRepository.findByIdIncludeRemoved(id);

    if (!member) {
      throw new AppError(
        "Project member not found.",
        404,
        "PROJECT_MEMBER_NOT_FOUND",
      );
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: member.projectId,
      userId: requesterId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    await this.projectMemberRepository.restore(id);

    return {
      id: member.id,
      userId: member.userId,
      restored: true,
    };
  }
}
