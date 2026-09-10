import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

export class WorkspaceSettingsController {
  constructor({ getWorkspaceSettingsUseCase, updateWorkspaceSettingsUseCase }) {
    this.getWorkspaceSettingsUseCase = getWorkspaceSettingsUseCase;

    this.updateWorkspaceSettingsUseCase = updateWorkspaceSettingsUseCase;
  }

  get = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;

    const result =
      await this.getWorkspaceSettingsUseCase.execute(organizationId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  update = asyncHandler(async (req, res) => {
    const organizationId = req.context.organization.id;

    const requesterRole = req.context.membership.role;

    const result = await this.updateWorkspaceSettingsUseCase.execute(
      organizationId,
      req.body,
      requesterRole,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
