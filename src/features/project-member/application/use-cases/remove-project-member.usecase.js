import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";

export class RemoveProjectMemberUseCase {
  constructor(projectMemberRepository, checkProjectAccessUseCase) {
    this.projectMemberRepository = projectMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ id, requesterId }) {
    const member = await this.projectMemberRepository.findById(id);

    if (!member) {
      throw new AppError(
        "Project member not found.",
        404,
        "PROJECT_MEMBER_NOT_FOUND",
      );
    }

    const requesterMembership =
      await this.projectMemberRepository.findByProjectAndUser(
        member.projectId,
        requesterId,
      );

    if (!requesterMembership) {
      throw new AppError(
        "You are not a project member.",
        403,
        "PROJECT_ACCESS_DENIED",
      );
    }

    if (
      requesterMembership.role === ProjectMemberRole.MEMBER ||
      requesterMembership.role === ProjectMemberRole.VIEWER
    ) {
      throw new AppError(
        "You do not have permission to remove members.",
        403,
        "INSUFFICIENT_PERMISSION",
      );
    }

    if (
      requesterMembership.role === ProjectMemberRole.ADMIN &&
      member.role === ProjectMemberRole.OWNER
    ) {
      throw new AppError(
        "Admin cannot remove project owner.",
        403,
        "OWNER_REMOVAL_NOT_ALLOWED",
      );
    }

    if (member.role === ProjectMemberRole.OWNER) {
      throw new AppError(
        "Project owner cannot be removed.",
        400,
        "PROJECT_OWNER_PROTECTED",
      );
    }

    await this.projectMemberRepository.delete(id);

    return {
      id: member.id,
      userId: member.userId,
      removed: true,
    };
  }
}
