export class Conversation {
  constructor({
    id = null,
    userId = null,
    visitorId = null,
    projectId,
    agentId,
    title = "New Conversation",
    isHandover = false,
    handoverRequestedAt = null,
    isCompleted = false,
    completedAt = null,
    completedBy = null,
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
    this.isHandover = isHandover;
    this.handoverRequestedAt = handoverRequestedAt;

    this.isCompleted = isCompleted;
    this.completedAt = completedAt;
    this.completedBy = completedBy;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  updateTitle(title) {
    this.title = title;
    this.updatedAt = new Date();
  }

  setHandoverMode(isHandover) {
    this.isHandover = isHandover;
    if (isHandover) {
      this.handoverRequestedAt = new Date();
    }
    this.updatedAt = new Date();
  }

  completeConversation(completedBy = null) {
    this.isCompleted = true;
    this.isHandover = false;
    this.completedAt = new Date();
    if (completedBy) {
      this.completedBy = completedBy;
    }
    this.updatedAt = new Date();
  }

  touch() {
    this.updatedAt = new Date();
  }
}
