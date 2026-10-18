export class ProjectAnalyticsRepository {
  async getOverview(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getTrends(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getPopularPages(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getLandingPages(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getCampaigns(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getVisitors(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getVisitorDetails(projectId, visitorId) {
    throw new Error("Method not implemented");
  }

  async getTrafficSources(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getDeviceBreakdown(projectId, options) {
    throw new Error("Method not implemented");
  }

  async getChatbotAnalytics(projectId, options) {
    throw new Error("Method not implemented");
  }

  async findConfigByProjectId(projectId) {
    throw new Error("Method not implemented");
  }

  async findConfigByTrackingKey(trackingKey) {
    throw new Error("Method not implemented");
  }

  async createConfig(data) {
    throw new Error("Method not implemented");
  }

  async updateConfig(projectId, updates) {
    throw new Error("Method not implemented");
  }

  async rotateTrackingKey(projectId, newKey) {
    throw new Error("Method not implemented");
  }

  async recordEvent(eventData) {
    throw new Error("Method not implemented");
  }

  async isRecentDuplicateEvent(options) {
    throw new Error("Method not implemented");
  }
}

