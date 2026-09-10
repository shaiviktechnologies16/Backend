export class OrganizationInvitationEntity {
  constructor({
    id,
    organizationId,
    email,
    role,
    token,
    status = "PENDING",
    expiresAt,
    acceptedAt = null,
    createdBy,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.email = email;
    this.role = role;

    this.token = token;
    this.status = status;

    this.expiresAt = expiresAt;
    this.acceptedAt = acceptedAt;

    this.createdBy = createdBy;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isPending() {
    return this.status === "PENDING";
  }

  isAccepted() {
    return this.status === "ACCEPTED";
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }

  accept() {
    this.status = "ACCEPTED";
    this.acceptedAt = new Date();
    this.updatedAt = new Date();
  }

  revoke() {
    this.status = "REVOKED";
    this.updatedAt = new Date();
  }

  expire() {
    this.status = "EXPIRED";
    this.updatedAt = new Date();
  }
}
