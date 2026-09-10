import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import {
  createAgentToolSchema,
  updateAgentToolSchema,
} from "../validators/agent-tool.validator.js";

export class AgentToolController {
  constructor(
    createAgentToolUseCase,
    getAgentToolsUseCase,
    updateAgentToolUseCase,
    deleteAgentToolUseCase,
  ) {
    this.createAgentToolUseCase = createAgentToolUseCase;
    this.getAgentToolsUseCase = getAgentToolsUseCase;
    this.updateAgentToolUseCase = updateAgentToolUseCase;
    this.deleteAgentToolUseCase = deleteAgentToolUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const { error, value } = createAgentToolSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.details.map((detail) => detail.message).join(", "),
        },
      });
    }

    const tool = await this.createAgentToolUseCase.execute({
      userId: req.user.id,
      agentId: req.params.agentId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      data: tool,
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const tools = await this.getAgentToolsUseCase.execute({
      userId: req.user.id,
      agentId: req.params.agentId,
    });

    return res.status(200).json({
      success: true,
      data: tools,
    });
  });

  update = asyncHandler(async (req, res) => {
    const { error, value } = updateAgentToolSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.details.map((detail) => detail.message).join(", "),
        },
      });
    }

    const tool = await this.updateAgentToolUseCase.execute({
      userId: req.user.id,
      toolId: req.params.toolId,
      data: value,
    });

    return res.status(200).json({
      success: true,
      data: tool,
    });
  });

  delete = asyncHandler(async (req, res) => {
    await this.deleteAgentToolUseCase.execute({
      userId: req.user.id,
      toolId: req.params.toolId,
    });

    return res.status(200).json({
      success: true,
      message: "Agent tool deleted successfully.",
    });
  });
}
