export class OrganizationMemberEntity {
  constructor({
    id,
    organizationId,
    userId,
    role,
    invitedBy,
    joinedAt,
    status,
    removedAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.userId = userId;
    this.role = role;
    this.invitedBy = invitedBy;
    this.joinedAt = joinedAt;
    this.status = status;
    this.removedAt = removedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
