import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

export class OrganizationModelAccessController {
  constructor({
    addModelAccessUseCase,
    getOrganizationModelsUseCase,
    removeModelAccessUseCase,
  }) {
    this.addModelAccessUseCase = addModelAccessUseCase;
    this.getOrganizationModelsUseCase = getOrganizationModelsUseCase;
    this.removeModelAccessUseCase = removeModelAccessUseCase;
  }

  add = asyncHandler(async (req, res) => {
    const access = await this.addModelAccessUseCase.execute(req.body);

    res.status(201).json(access);
  });

  getAll = asyncHandler(async (req, res) => {
    const models = await this.getOrganizationModelsUseCase.execute(
      req.params.organizationId,
    );

    res.json(models);
  });

  remove = asyncHandler(async (req, res) => {
    await this.removeModelAccessUseCase.execute({
      organizationId: req.params.organizationId,
      aiModelId: req.params.aiModelId,
    });

    res.status(204).send();
  });
}
