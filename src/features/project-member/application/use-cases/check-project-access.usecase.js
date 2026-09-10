import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";
import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class CheckProjectAccessUseCase {
  constructor(
    projectMemberRepository,
    projectRepository = null,
    organizationMemberRepository = null,
  ) {
    this.projectMemberRepository = projectMemberRepository;
    this.projectRepository = projectRepository;
    this.organizationMemberRepository = organizationMemberRepository;
  }

  async execute({ projectId, userId, allowedRoles = [] }) {
    let member = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (member && member.status === "REMOVED") {
      throw new AppError(
        "Project access has been removed.",
        403,
        "PROJECT_ACCESS_REMOVED",
      );
    }

    if (!member) {
      if (this.projectRepository && this.organizationMemberRepository) {
        const project = await this.projectRepository.findById(projectId);
        if (project) {
          if (project.createdBy === userId) {
            member = { role: ProjectMemberRole.OWNER, status: "ACTIVE" };
          } else {
            const orgMember =
              await this.organizationMemberRepository.findByOrganizationAndUser(
                project.organizationId,
                userId,
              );
            if (
              orgMember &&
              [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(
                orgMember.role,
              )
            ) {
              member = { role: ProjectMemberRole.OWNER, status: "ACTIVE" };
            }
          }
        }
      }
    }

    if (!member) {
      throw new AppError(
        "User does not have access to this project.",
        403,
        "PROJECT_ACCESS_DENIED",
      );
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
      if (this.projectRepository && this.organizationMemberRepository) {
        const project = await this.projectRepository.findById(projectId);
        if (project) {
          const orgMember =
            await this.organizationMemberRepository.findByOrganizationAndUser(
              project.organizationId,
              userId,
            );
          if (
            orgMember &&
            [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(
              orgMember.role,
            )
          ) {
            return member;
          }
        }
      }

      throw new AppError(
        "User does not have permission for this action.",
        403,
        "PROJECT_PERMISSION_FORBIDDEN",
      );
    }

    return member;
  }
}
