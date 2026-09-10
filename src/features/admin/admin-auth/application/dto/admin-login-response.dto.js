export class AdminLoginResponseDto {
  constructor({
    portal,
    accessToken,
    refreshToken,
    admin,
    permissions = [],
    organizations = [],
  }) {
    this.success = true;
    this.message = "Admin login successful.";

    this.data = {
      portal,

      accessToken,
      refreshToken,

      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        platformRole: admin.platformRole,
        role: admin.role,
        permissions,
      },

      organizations,
    };
  }
}
