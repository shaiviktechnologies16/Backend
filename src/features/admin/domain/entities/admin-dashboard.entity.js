export class AdminDashboardEntity {
  constructor({
    users = 0,
    organizations = 0,
    projects = 0,
    agents = 0,
    conversations = 0,
    messages = 0,
    requestsToday = 0,
    tokensToday = 0,
    activeOrganizations = 0,
    activeUsers = 0,
    organizationsToday = 0,
    usersToday = 0,
    recentOrganizations = [],
    activities = [],
    systemStatus = [],
  }) {
    this.overview = {
      users,
      organizations,
      projects,
      agents,
      conversations,
      messages,
    };
    this.analytics = {
      requestsToday,
      tokensToday,
    };
    this.platform = {
      activeOrganizations,
      activeUsers,
      organizationsToday,
      usersToday,
    };
    this.recentOrganizations = recentOrganizations;
    this.activities = activities;
    this.systemStatus = systemStatus;
  }
}
