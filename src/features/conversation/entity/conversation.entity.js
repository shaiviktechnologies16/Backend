export class Conversation {
  constructor({
    id = null,
    userId = null,
    visitorId = null,
    projectId,
    agentId,
    title = "New Conversation",
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;

    // Internal authenticated user
    this.userId = userId;

    // Public website visitor
    this.visitorId = visitorId;

    this.projectId = projectId;
    this.agentId = agentId;

    this.title = title;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  updateTitle(title) {
    this.title = title;
    this.updatedAt = new Date();
  }
}
