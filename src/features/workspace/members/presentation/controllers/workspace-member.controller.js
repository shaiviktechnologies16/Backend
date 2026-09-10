import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

export class WorkspaceMemberController {
  constructor({
    getMembersUseCase,
    updateMemberRoleUseCase,
    removeMemberUseCase,
    inviteMemberUseCase,
    restoreMemberUseCase,
    updateMemberStatusUseCase,
  }) {
    this.getMembersUseCase = getMembersUseCase;
    this.updateMemberRoleUseCase = updateMemberRoleUseCase;
    this.removeMemberUseCase = removeMemberUseCase;
    this.inviteMemberUseCase = inviteMemberUseCase;
    this.restoreMemberUseCase = restoreMemberUseCase;
    this.updateMemberStatusUseCase = updateMemberStatusUseCase;
  }

  getMembers = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;

    const result = await this.getMembersUseCase.execute(organizationId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  invite = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;
    const invitedBy = req.context.user.id;

    const result = await this.inviteMemberUseCase.execute({
      organizationId,
      email: req.body.email,
      role: req.body.role,
      permissions: req.body.permissions ?? [],
      invitedBy,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  updateRole = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;
    const memberId = req.params.id;
    const requesterRole = req.context.membership.role;
    const result = await this.updateMemberRoleUseCase.execute({
      organizationId,
      requesterRole,
      memberId,
      role: req.body.role,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  remove = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;
    const memberId = req.params.id;
    const requesterId = req.context.user.id;
    const requesterRole = req.context.membership.role;

    const result = await this.removeMemberUseCase.execute({
      organizationId,
      memberId,
      requesterId,
      requesterRole,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  restore = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;
    const memberId = req.params.id;
    const requesterRole = req.context.membership.role;

    const result = await this.restoreMemberUseCase.execute({
      organizationId,
      memberId,
      requesterRole,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  });
  updateStatus = asyncHandler(async (req, res) => {
    const result = await this.updateMemberStatusUseCase.execute({
      organizationId: req.context.organization.id,
      memberId: req.params.id,
      requesterId: req.context.user.id,
      requesterRole: req.context.membership.role,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      success: true,
      message: "Member status updated successfully.",
      data: result,
    });
  });
}
