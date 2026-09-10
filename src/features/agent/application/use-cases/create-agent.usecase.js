import { generatePublicKey } from "../../../../common/utils/public-key.js";

import { Agent } from "../../domain/entities/agent.entity.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";
import { AgentVisibility } from "../../domain/constants/agent-visibility.js";

export class CreateAgentUseCase {
  constructor({
    agentRepository,
    projectRepository,
    checkProjectAccessUseCase,
    organizationModelAccessRepository,
    organizationModelEntitlementService = null,
  }) {
    this.agentRepository = agentRepository;
    this.projectRepository = projectRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
    this.organizationModelAccessRepository = organizationModelAccessRepository;
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
  }

  async execute({
    userId,
    organizationId,
    projectId,
    aiModelId,
    name,
    description,
    systemPrompt,
    temperature,
    maxTokens,
    isDefault,
    visibility = AgentVisibility.PRIVATE,
    widgetConfig = {},
  }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    const targetOrgId = organizationId || project.organizationId;

    if (this.organizationModelEntitlementService && targetOrgId) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId: targetOrgId,
          },
        );
      } catch (syncErr) {
        console.error(
          "Failed to auto-sync organization model entitlements in CreateAgentUseCase:",
          syncErr,
        );
      }
    }

    const existingAgent = await this.agentRepository.findByNameAndProject(
      projectId,
      name,
    );

    if (existingAgent) {
      throw new AppError(
        "Agent with this name already exists.",
        409,
        "AGENT_ALREADY_EXISTS",
      );
    }

    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    if (!aiModelId) {
      throw new AppError("AI model is required.", 400, "AI_MODEL_REQUIRED");
    }

    const modelAccess = await this.organizationModelAccessRepository.findOne(
      organizationId,
      aiModelId,
    );

    if (!modelAccess) {
      throw new AppError(
        "AI model is not available for this organization.",
        403,
        "MODEL_ACCESS_DENIED",
      );
    }

    if (!modelAccess.aiModel) {
      throw new AppError(
        "AI model configuration not found.",
        404,
        "AI_MODEL_NOT_FOUND",
      );
    }

    if (modelAccess.aiModel.status !== "ACTIVE") {
      throw new AppError("AI model is not active.", 400, "AI_MODEL_INACTIVE");
    }

    if (modelAccess.aiModel.capability !== "CHAT") {
      throw new AppError(
        "Selected AI model is not a chat model.",
        400,
        "AI_MODEL_CAPABILITY_INVALID",
      );
    }

    const publicKey =
      visibility === AgentVisibility.PUBLIC ? generatePublicKey() : null;

    const cleanedWidgetConfig = widgetConfig
      ? {
          ...widgetConfig,
          suggestedQuestions: Array.isArray(widgetConfig.suggestedQuestions)
            ? widgetConfig.suggestedQuestions
                .map((q) => (typeof q === "string" ? q.trim() : ""))
                .filter(Boolean)
            : [],
        }
      : {};

    const agent = new Agent({
      userId,
      projectId,
      aiModelId: modelAccess.aiModel.id,
      name,
      description,
      systemPrompt,
      provider: modelAccess.aiModel.provider,
      model: modelAccess.aiModel.model,
      temperature,
      maxTokens,
      isDefault,
      visibility,
      publicKey,
      widgetConfig: cleanedWidgetConfig,
    });

    return this.agentRepository.create(agent);
  }
}
