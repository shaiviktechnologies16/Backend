import { AppError } from "../../../common/errors/AppError.js";
import { AIRequestContext } from "../entity/ai-request-context.js";

export class AIContextService {
  constructor({
    userRepository,
    agentRepository,
    projectRepository,
    projectMemberRepository,
    organizationRepository,
    organizationAISettingsRepository,
    promptBuilder,
    checkProjectAccessUseCase,
  }) {
    this.userRepository = userRepository;
    this.agentRepository = agentRepository;
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.organizationRepository = organizationRepository;
    this.organizationAISettingsRepository = organizationAISettingsRepository;
    this.promptBuilder = promptBuilder;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;

    this.publicOrganizationCache = new Map();

    this.publicContextCacheTtl = 60 * 1000;
  }

  async build({ userId, agentId, conversation = null }) {
    const user = await this.userRepository.findById(userId);

    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    let project = null;

    if (agent.projectId) {
      await this.checkProjectAccessUseCase.execute({
        projectId: agent.projectId,
        userId,
      });

      project = await this.projectRepository.findById(agent.projectId);
    }

    let organization = null;
    let projectMember = null;

    if (project?.organizationId) {
      projectMember = await this.projectMemberRepository.findByProjectAndUser(
        agent.projectId,
        userId,
      );

      organization = await this.organizationRepository.findById(
        project.organizationId,
      );
    }

    return new AIRequestContext({
      user,
      organization,
      project,
      agent,
      projectMember,
      conversation,
    });
  }

  buildSystemMessage(context, options = {}) {
    return this.promptBuilder.build(context, options);
  }

  async buildPublic({ agent, project = null, conversation = null }) {
    if (!agent) {
      throw new AppError("Agent not found.", 404, "PUBLIC_AGENT_NOT_FOUND");
    }

    if (agent.visibility !== "PUBLIC") {
      throw new AppError("Agent is not public.", 403, "AGENT_NOT_PUBLIC");
    }

    const resolvedProject =
      project ??
      agent.project ??
      (agent.projectId
        ? await this.projectRepository.findById(agent.projectId)
        : null);

    let organization = null;
    let aiSettings = null;

    if (resolvedProject?.organizationId) {
      const organizationId = resolvedProject.organizationId;

      const cached = this.publicOrganizationCache.get(organizationId);

      if (
        cached &&
        Date.now() - cached.createdAt < this.publicContextCacheTtl
      ) {
        organization = cached.organization;
        aiSettings = cached.aiSettings;
      } else {
        const contextStartedAt = Date.now();

        [organization, aiSettings] = await Promise.all([
          this.organizationRepository.findById(organizationId),
          this.organizationAISettingsRepository.findByOrganizationId(
            organizationId,
          ),
        ]);

        console.log("[AI CONTEXT DB LOAD]", {
          organizationId,
          durationMs: Date.now() - contextStartedAt,
        });

        this.publicOrganizationCache.set(organizationId, {
          organization,
          aiSettings,
          createdAt: Date.now(),
        });
      }
    }

    return new AIRequestContext({
      user: null,
      organization,
      project: resolvedProject,
      agent,
      projectMember: null,
      conversation,
      aiSettings,
    });
  }
}
