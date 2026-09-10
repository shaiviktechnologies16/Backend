import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

export class WorkspaceModelController {
  constructor({ getWorkspaceModelsUseCase }) {
    this.getWorkspaceModelsUseCase = getWorkspaceModelsUseCase;
  }

  getAll = asyncHandler(async (req, res) => {
    const models = await this.getWorkspaceModelsUseCase.execute(
      req.context.organization.id,
    );

    res.json(models);
  });
}
