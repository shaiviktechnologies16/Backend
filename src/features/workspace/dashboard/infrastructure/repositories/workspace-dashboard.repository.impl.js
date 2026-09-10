import { WorkspaceDashboardRepository } from "../../domain/repositories/workspace-dashboard.repository.js";
import { WorkspaceDashboardEntity } from "../../domain/entities/workspace-dashboard.entity.js";

export class WorkspaceDashboardRepositoryImpl extends WorkspaceDashboardRepository {
  constructor({
    projectRepository,
    organizationMemberRepository,
    agentRepository,
    conversationRepository,
  }) {
    super();

    this.projectRepository = projectRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.agentRepository = agentRepository;
    this.conversationRepository = conversationRepository;
  }

  async getDashboardSummary(organizationId) {
    const projects =
      await this.projectRepository.findByOrganizationId(organizationId);

    const recentProjects = projects.slice(0, 5);

    const projectIds = projects.map((project) => project.id);

    const [
      memberCount,
      agentCount,
      conversationCount,
      recentAgents,
      recentConversations,
    ] = await Promise.all([
      this.organizationMemberRepository.countByOrganization(organizationId),
      this.agentRepository.countByProjectIds(projectIds),
      this.conversationRepository.countByProjectIds(projectIds),
      this.agentRepository.findRecentByProjectIds(projectIds, 5),
      this.conversationRepository.findRecentByProjectIds(projectIds, 5),
    ]);

    return new WorkspaceDashboardEntity({
      overview: {
        projects: projects.length,
        agents: agentCount,
        conversations: conversationCount,
        members: memberCount,
      },
      recentProjects: recentProjects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
      })),
      recentAgents,
      recentConversations,
    });
  }
}
