import { ProjectEntity } from "../../domain/entities/project.entity.js";
import { ProjectMember } from "../../../project-member/domain/entities/project-member.entity.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";
import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class CreateProjectUseCase {
  constructor(
    dataSource,
    projectRepository,
    organizationRepository,
    organizationMemberRepository,
    projectMemberRepository,
  ) {
    this.dataSource = dataSource;
    this.projectRepository = projectRepository;
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.projectMemberRepository = projectMemberRepository;
  }

  async execute({ organizationId, name, description = null, userId }) {
    return this.dataSource.transaction(async (manager) => {
      const organization = await this.organizationRepository.findById(
        organizationId,
        manager,
      );

      if (!organization) {
        throw new AppError(
          "Organization not found.",
          404,
          "ORGANIZATION_NOT_FOUND",
        );
      }

      const member =
        await this.organizationMemberRepository.findByOrganizationAndUser(
          organizationId,
          userId,
          manager,
        );

      if (!member) {
        throw new AppError(
          "User is not a member of this organization.",
          403,
          "ORGANIZATION_ACCESS_DENIED",
        );
      }

      const allowedRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN];

      if (!allowedRoles.includes(member.role)) {
        throw new AppError(
          "You do not have permission to create a project.",
          403,
          "PROJECT_CREATE_NOT_ALLOWED",
        );
      }

      const existingProject = await this.projectRepository.findByName(
        organizationId,
        name,
        manager,
      );

      if (existingProject) {
        throw new AppError(
          "Project with this name already exists in this organization.",
          409,
        );
      }

      const project = new ProjectEntity({
        organizationId,
        name,
        description,
        createdBy: userId,
      });

      const savedProject = await this.projectRepository.create(
        project,
        manager,
      );

      const projectMember = new ProjectMember({
        projectId: savedProject.id,
        userId,
        role: ProjectMemberRole.OWNER,
      });

      await this.projectMemberRepository.create(projectMember, manager);

      return savedProject;
    });
  }
}
