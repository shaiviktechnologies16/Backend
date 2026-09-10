export class AgentContextEntity {
  constructor({ id, name, provider, model, status }) {
    this.id = id;
    this.name = name;
    this.provider = provider;
    this.model = model;
    this.status = status;

    Object.freeze(this);
  }

  isActive() {
    return this.status === "ACTIVE";
  }
}
