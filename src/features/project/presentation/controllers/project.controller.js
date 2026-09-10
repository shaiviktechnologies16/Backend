import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ProjectResponse } from "../../application/dto/responses/project.response.js";
import { ProjectDetailResponse } from "../../application/dto/responses/project-detail.response.js";

export class ProjectController {
  constructor({ createProjectUseCase, projectService }) {
    this.createProjectUseCase = createProjectUseCase;

    this.projectService = projectService;
  }

  createProject = asyncHandler(async (req, res) => {
    const project = await this.createProjectUseCase.execute({
      organizationId: req.context.organization.id,
      name: req.body.name,
      description: req.body.description,
      userId: req.context.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully.",

      data: ProjectResponse.fromEntity(project),
    });
  });

  getProject = asyncHandler(async (req, res) => {
    const project = await this.projectService.getProject(
      req.context.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: ProjectDetailResponse.fromEntity(project),
    });
  });

  getProjects = asyncHandler(async (req, res) => {
    const projects = await this.projectService.getProjects(
      req.context.organization.id,
      req.context.user.id,
    );

    res.status(200).json({
      success: true,
      data: projects.map((project) => ProjectResponse.fromEntity(project)),
    });
  });

  updateProject = asyncHandler(async (req, res) => {
    const project = await this.projectService.updateProject(
      req.user.id,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: ProjectResponse.fromEntity(project),
    });
  });

  deleteProject = asyncHandler(async (req, res) => {
    await this.projectService.deleteProject(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
    });
  });

  setDefaultProject = asyncHandler(async (req, res) => {
    const project = await this.projectService.setDefaultProject(
      req.user.id,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: ProjectResponse.fromEntity(project),
    });
  });

  getDefaultProject = asyncHandler(async (req, res) => {
    const project = await this.projectService.getDefaultProject(req.user.id);

    res.status(200).json({
      success: true,
      data: project ? ProjectResponse.fromEntity(project) : null,
    });
  });
}
