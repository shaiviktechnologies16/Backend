export class AIRequestContext {
  constructor({
    user,
    organization = null,
    project = null,
    agent,
    conversation = null,
    projectMember = null,
    aiSettings = null,
  }) {
    this.user = user;
    this.organization = organization;
    this.project = project;
    this.agent = agent;
    this.conversation = conversation;
    this.projectMember = projectMember;
    this.aiSettings = aiSettings;
  }
}
