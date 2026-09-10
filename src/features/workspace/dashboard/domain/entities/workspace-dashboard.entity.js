export class WorkspaceDashboardEntity {
  constructor({
    overview,
    recentProjects = [],
    recentAgents = [],
    recentConversations = [],
  }) {
    this.overview = overview;
    this.recentProjects = recentProjects;
    this.recentAgents = recentAgents;
    this.recentConversations = recentConversations;
  }

  toJSON() {
    return {
      overview: this.overview,
      recentProjects: this.recentProjects,
      recentAgents: this.recentAgents,
      recentConversations: this.recentConversations,
    };
  }
}
