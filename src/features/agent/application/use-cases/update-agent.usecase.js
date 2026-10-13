import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";

export class UpdateAgentUseCase {
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

  async execute({ userId, agentId, data }) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    await this.checkProjectAccessUseCase.execute({
      projectId: agent.projectId,
      userId,
      allowedRoles: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN],
    });

    const updateData = { ...data };

    if (
      data?.aiModelId &&
      this.organizationModelAccessRepository &&
      this.projectRepository
    ) {
      const project = await this.projectRepository.findById(agent.projectId);
      if (project?.organizationId) {
        const modelAccess =
          await this.organizationModelAccessRepository.findOne(
            project.organizationId,
            data.aiModelId,
          );

        if (!modelAccess || !modelAccess.aiModel) {
          throw new AppError(
            "AI model is not available for this organization.",
            403,
            "MODEL_ACCESS_DENIED",
          );
        }

        if (modelAccess.aiModel.status !== "ACTIVE") {
          throw new AppError(
            "AI model is not active.",
            400,
            "AI_MODEL_INACTIVE",
          );
        }

        if (modelAccess.aiModel.capability !== "CHAT") {
          throw new AppError(
            "Selected AI model is not a chat model.",
            400,
            "AI_MODEL_CAPABILITY_INVALID",
          );
        }

        updateData.aiModelId = modelAccess.aiModel.id;
        updateData.provider = modelAccess.aiModel.provider;
        updateData.model = modelAccess.aiModel.model;
        updateData.aiModel = modelAccess.aiModel;
      }
    }

    if (updateData.widgetConfig) {
      updateData.widgetConfig = {
        ...updateData.widgetConfig,
        suggestedQuestions: Array.isArray(
          updateData.widgetConfig.suggestedQuestions,
        )
          ? updateData.widgetConfig.suggestedQuestions
              .map((q) => (typeof q === "string" ? q.trim() : ""))
              .filter(Boolean)
          : [],
      };
    }

    agent.update(updateData);
    return await this.agentRepository.update(agent);
  }
}
