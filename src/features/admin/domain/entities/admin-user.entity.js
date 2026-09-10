export class AdminUserEntity {
  constructor({
    id,
    fullName,
    email,
    platformRole,
    isActive,
    permissions = [],
    organizations = [],
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.fullName = fullName;
    this.email = email;
    this.platformRole = platformRole;
    this.isActive = isActive;
    this.permissions = permissions;
    this.organizations = organizations;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
