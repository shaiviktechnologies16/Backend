import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ProjectMemberValidator } from "../validators/project-member.validator.js";

export class ProjectMemberController {
  constructor(
    addProjectMemberUseCase,
    getProjectMembersUseCase,
    updateProjectMemberRoleUseCase,
    removeProjectMemberUseCase,
    restoreProjectMemberUseCase,
  ) {
    this.addProjectMemberUseCase = addProjectMemberUseCase;
    this.getProjectMembersUseCase = getProjectMembersUseCase;
    this.updateProjectMemberRoleUseCase = updateProjectMemberRoleUseCase;
    this.removeProjectMemberUseCase = removeProjectMemberUseCase;
    this.restoreProjectMemberUseCase = restoreProjectMemberUseCase;
  }

  getRequesterId(req) {
    return (
      req.user?.id ?? req.context?.user?.id ?? req.auth?.user?.id ?? req.userId
    );
  }

  add = asyncHandler(async (req, res) => {
    const body = ProjectMemberValidator.validateCreate(req.body);

    const member = await this.addProjectMemberUseCase.execute({
      projectId: req.params.projectId,
      userId: body.userId,
      role: body.role,
      requesterId: this.getRequesterId(req),
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const members = await this.getProjectMembersUseCase.execute({
      projectId: req.params.projectId,
      requesterId: this.getRequesterId(req),
    });

    res.status(200).json({
      success: true,
      data: members,
    });
  });

  updateRole = asyncHandler(async (req, res) => {
    const body = ProjectMemberValidator.validateUpdate(req.body);

    const member = await this.updateProjectMemberRoleUseCase.execute({
      id: req.params.memberId,
      role: body.role,
      requesterId: this.getRequesterId(req),
    });

    res.status(200).json({
      success: true,
      data: member,
    });
  });

  remove = asyncHandler(async (req, res) => {
    await this.removeProjectMemberUseCase.execute({
      id: req.params.memberId,
      requesterId: this.getRequesterId(req),
    });

    res.status(200).json({
      success: true,
      message: "Project member removed successfully.",
    });
  });

  restore = asyncHandler(async (req, res) => {
    const result = await this.restoreProjectMemberUseCase.execute({
      id: req.params.id,
      requesterId: this.getRequesterId(req),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
