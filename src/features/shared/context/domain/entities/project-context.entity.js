export class ProjectContextEntity {
  constructor({ id, name, status }) {
    this.id = id;
    this.name = name;
    this.status = status;

    Object.freeze(this);
  }

  isActive() {
    return this.status === "ACTIVE";
  }
}
