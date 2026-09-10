export class OrganizationContextEntity {
  constructor({ id, name, slug, role, status }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.role = role;
    this.status = status;

    Object.freeze(this);
  }

  isOwner() {
    return this.role === "OWNER";
  }

  isAdmin() {
    return this.role === "ADMIN";
  }

  isMember() {
    return this.role === "MEMBER";
  }

  isActive() {
    return this.status === "ACTIVE";
  }
}
