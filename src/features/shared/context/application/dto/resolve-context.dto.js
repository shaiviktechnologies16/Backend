export class ResolveContextDto {
  constructor({
    userId,
    organizationId = null,
    projectId = null,
    agentId = null,
  }) {
    this.userId = userId;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.agentId = agentId;
  }

  hasOrganization() {
    return this.organizationId !== null;
  }

  hasProject() {
    return this.projectId !== null;
  }

  hasAgent() {
    return this.agentId !== null;
  }
}
