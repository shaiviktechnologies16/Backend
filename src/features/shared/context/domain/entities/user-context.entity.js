export class UserContextEntity {
  constructor({
    id,
    email,
    platformRole,
    permissions = [],
    organizationId = null,
  }) {
    this.id = id;
    this.email = email;
    this.platformRole = platformRole;
    this.permissions = permissions;
    this.organizationId = organizationId;

    Object.freeze(this);
  }

  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  isSuperAdmin() {
    return this.platformRole === "PLATFORM_ADMIN";
  }

  isAdmin() {
    return this.platformRole === "PLATFORM_ADMIN";
  }

  isUser() {
    return this.platformRole === "USER";
  }
}
