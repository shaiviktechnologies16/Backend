import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

export class AIModelController {
  constructor({
    createAIModelUseCase,
    getAIModelsUseCase,
    getAIModelUseCase,
    updateAIModelUseCase,
    updateAIModelStatusUseCase,
  }) {
    this.createAIModelUseCase = createAIModelUseCase;
    this.getAIModelsUseCase = getAIModelsUseCase;
    this.getAIModelUseCase = getAIModelUseCase;
    this.updateAIModelUseCase = updateAIModelUseCase;
    this.updateAIModelStatusUseCase = updateAIModelStatusUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const model = await this.createAIModelUseCase.execute(req.body);

    res.status(201).json(model);
  });

  getAll = asyncHandler(async (req, res) => {
    console.log("AI MODEL GET ALL HIT");

    const models = await this.getAIModelsUseCase.execute();

    res.json(models);
  });

  getById = asyncHandler(async (req, res) => {
    const model = await this.getAIModelUseCase.execute(req.params.id);

    res.json(model);
  });

  update = asyncHandler(async (req, res) => {
    const model = await this.updateAIModelUseCase.execute(
      req.params.id,
      req.body,
    );

    res.json(model);
  });

  updateStatus = asyncHandler(async (req, res) => {
    const result = await this.updateMemberStatusUseCase.execute({
      memberId: req.params.id,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      success: true,
      message: "Member status updated successfully.",
      data: result,
    });
  });
}
