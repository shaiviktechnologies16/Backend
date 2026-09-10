import { ProjectEntity } from "../../domain/entities/project.entity.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class ProjectService {
  constructor({
    projectRepository,
    projectMemberRepository,
    checkProjectAccessUseCase,
  }) {
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async createProject(data) {
    const project = new Project(data);

    const projects = await this.projectRepository.findByUserId(project.userId);

    if (projects.length === 0) {
      project.isDefault = true;
    }

    return await this.projectRepository.create(project);
  }

  async getProject(userId, id) {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    return project;
  }

  async getProjects(organizationId) {
    const projects =
      await this.projectRepository.findByOrganizationId(organizationId);

    return projects;
  }

  async updateProject(userId, id, data) {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: id,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    project.update(data);

    return await this.projectRepository.update(project);
  }

  async deleteProject(userId, id) {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: id,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    if (project.isDefault) {
      throw new AppError(
        "Default project cannot be deleted.",
        400,
        "DEFAULT_PROJECT_DELETE_NOT_ALLOWED",
      );
    }

    await this.projectRepository.delete(id);

    return true;
  }

  async setDefaultProject(userId, projectId) {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    await this.projectRepository.setDefault(userId, projectId);

    return await this.projectRepository.findDefault(userId);
  }

  async getDefaultProject(userId) {
    return await this.projectRepository.findDefault(userId);
  }
}
