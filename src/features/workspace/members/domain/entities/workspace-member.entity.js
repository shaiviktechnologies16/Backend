export class WorkspaceMemberEntity {
  constructor({
    id,
    organizationId,
    userId,
    role,
    email,
    name,
    status,
    isActive,
    joinedAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.userId = userId;
    this.role = role;
    this.email = email;
    this.name = name;
    this.status = status;
    this.isActive = isActive;
    this.joinedAt = joinedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}
