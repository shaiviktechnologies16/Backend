export class AdminEntity {
  constructor({
    id,
    name,
    email,
    passwordHash,
    platformRole = null,
    role = null,
    permissions = [],
    isActive = true,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.platformRole = platformRole;
    this.role = role;
    this.permissions = permissions;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getRoleName() {
    return this.platformRole ?? this.role?.name ?? null;
  }

  isPlatformAdmin() {
    return (
      this.platformRole === "PLATFORM_ADMIN" ||
      this.platformRole === "PLATFORM_MANAGER"
    );
  }

  isWorkspaceAdmin() {
    return this.role?.name === "OWNER" || this.role?.name === "ADMIN";
  }

  isAdmin() {
    return this.isPlatformAdmin() || this.isWorkspaceAdmin();
  }

  isSuperAdmin() {
    return this.platformRole === "PLATFORM_ADMIN";
  }

  hasPermission(permission) {
    if (this.isSuperAdmin()) {
      return true;
    }

    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissionList = []) {
    if (this.isSuperAdmin()) {
      return true;
    }

    return permissionList.some((permission) =>
      this.permissions.includes(permission),
    );
  }

  isAuthorized() {
    return this.isActive && this.isAdmin();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      platformRole: this.platformRole,
      role: this.role,
      permissions: this.permissions,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
