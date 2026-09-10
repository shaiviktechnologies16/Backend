import { ProjectMember } from "../../domain/entities/project-member.entity.js";
import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class AddProjectMemberUseCase {
  constructor(
    projectMemberRepository,
    projectRepository,
    organizationMemberRepository,
    checkProjectAccessUseCase,
  ) {
    this.projectMemberRepository = projectMemberRepository;
    this.projectRepository = projectRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({
    projectId,
    userId,
    role = ProjectMemberRole.MEMBER,
    requesterId,
  }) {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId: requesterId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    const organizationMember =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        project.organizationId,
        userId,
      );

    if (!organizationMember) {
      throw new AppError(
        "User must be a member of the organization before being added to a project.",
        403,
      );
    }

    const existing = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (existing) {
      throw new AppError("User already belongs to this project.", 409);
    }

    const member = new ProjectMember({
      projectId,
      userId,
      role,
    });

    return await this.projectMemberRepository.create(member);
  }
}
