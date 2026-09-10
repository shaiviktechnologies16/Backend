export class AdminSessionEntity {
  constructor({
    id,
    adminId,
    refreshTokenHash,
    deviceInfo = null,
    ipAddress = null,
    userAgent = null,
    expiresAt,
    revokedAt = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.adminId = adminId;
    this.refreshTokenHash = refreshTokenHash;
    this.deviceInfo = deviceInfo;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.expiresAt = expiresAt;
    this.revokedAt = revokedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }

  isRevoked() {
    return this.revokedAt !== null;
  }

  isActive() {
    return !this.isExpired() && !this.isRevoked();
  }

  revoke() {
    this.revokedAt = new Date();
    this.updatedAt = new Date();
  }

  renew(refreshTokenHash, expiresAt) {
    this.refreshTokenHash = refreshTokenHash;
    this.expiresAt = expiresAt;
    this.revokedAt = null;
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      adminId: this.adminId,
      deviceInfo: this.deviceInfo,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      expiresAt: this.expiresAt,
      revokedAt: this.revokedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
