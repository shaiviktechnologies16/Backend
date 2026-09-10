import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";

export class UpdateProjectMemberRoleUseCase {
  constructor(projectMemberRepository, checkProjectAccessUseCase) {
    this.projectMemberRepository = projectMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ id, role, requesterId }) {
    const member = await this.projectMemberRepository.findById(id);

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
      allowedRoles: [ProjectMemberRole.OWNER],
    });

    const allowedRoles = [
      ProjectMemberRole.OWNER,
      ProjectMemberRole.ADMIN,
      ProjectMemberRole.MEMBER,
      ProjectMemberRole.VIEWER,
    ];

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Invalid project member role.",
        400,
        "INVALID_PROJECT_MEMBER_ROLE",
      );
    }

    if (
      member.role === ProjectMemberRole.OWNER &&
      role !== ProjectMemberRole.OWNER
    ) {
      throw new AppError(
        "Project owner role cannot be changed.",
        400,
        "PROJECT_OWNER_ROLE_PROTECTED",
      );
    }

    if (role === ProjectMemberRole.OWNER) {
      const existingOwner =
        await this.projectMemberRepository.findOwnerByProjectId(
          member.projectId,
        );

      if (existingOwner && existingOwner.id !== member.id) {
        throw new AppError(
          "Project already has an owner.",
          400,
          "PROJECT_OWNER_ALREADY_EXISTS",
        );
      }
    }

    member.changeRole(role);

    return await this.projectMemberRepository.update(member);
  }
}
