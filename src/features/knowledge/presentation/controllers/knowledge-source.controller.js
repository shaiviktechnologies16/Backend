import { asyncHandler } from "../../../../common/utils/asyncHandler.js";

export class KnowledgeSourceController {
  constructor({
    createKnowledgeSourceUseCase,
    getKnowledgeSourceUseCase,
    getProjectKnowledgeSourcesUseCase,
    updateKnowledgeSourceUseCase,
    deleteKnowledgeSourceUseCase,
    ingestKnowledgeSourceUseCase,
    searchKnowledgeUseCase,
  }) {
    this.createKnowledgeSourceUseCase = createKnowledgeSourceUseCase;
    this.getKnowledgeSourceUseCase = getKnowledgeSourceUseCase;
    this.getProjectKnowledgeSourcesUseCase = getProjectKnowledgeSourcesUseCase;
    this.updateKnowledgeSourceUseCase = updateKnowledgeSourceUseCase;
    this.deleteKnowledgeSourceUseCase = deleteKnowledgeSourceUseCase;
    this.ingestKnowledgeSourceUseCase = ingestKnowledgeSourceUseCase;
    this.searchKnowledgeUseCase = searchKnowledgeUseCase;
  }

  createKnowledgeSource = asyncHandler(async (req, res) => {
    const source = await this.createKnowledgeSourceUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Knowledge source created successfully.",
      data: source,
    });
  });

  getKnowledgeSources = asyncHandler(async (req, res) => {
    const sources = await this.getProjectKnowledgeSourcesUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
    });

    res.status(200).json({
      success: true,
      data: sources,
    });
  });

  getKnowledgeSource = asyncHandler(async (req, res) => {
    const source = await this.getKnowledgeSourceUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      knowledgeSourceId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: source,
    });
  });

  updateKnowledgeSource = asyncHandler(async (req, res) => {
    const source = await this.updateKnowledgeSourceUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      knowledgeSourceId: req.params.id,
      ...req.body,
    });

    res.status(200).json({
      success: true,
      message: "Knowledge source updated successfully.",
      data: source,
    });
  });

  deleteKnowledgeSource = asyncHandler(async (req, res) => {
    await this.deleteKnowledgeSourceUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      knowledgeSourceId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Knowledge source deleted successfully.",
    });
  });
  ingestKnowledgeSource = asyncHandler(async (req, res) => {
    const source = await this.ingestKnowledgeSourceUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      knowledgeSourceId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Knowledge source ingested successfully.",
      data: source,
    });
  });
  searchKnowledge = asyncHandler(async (req, res) => {
    const results = await this.searchKnowledgeUseCase.execute({
      userId: req.context.user.id,
      projectId: req.context.project.id,
      query: req.body.query,
      limit: req.body.limit,
    });

    res.status(200).json({
      success: true,
      data: results,
    });
  });
}
