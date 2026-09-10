export class RequestContextEntity {
  constructor({
    user,
    organization = null,
    membership = null,
    project = null,
    agent = null,
  }) {
    this.user = user;
    this.organization = organization;
    this.membership = membership;
    this.project = project;
    this.agent = agent;

    Object.freeze(this);
  }

  hasOrganization() {
    return this.organization !== null;
  }

  hasMembership() {
    return this.membership !== null;
  }

  hasProject() {
    return this.project !== null;
  }

  hasAgent() {
    return this.agent !== null;
  }
}
