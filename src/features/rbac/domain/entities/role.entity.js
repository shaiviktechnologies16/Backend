export class RoleEntity {
  constructor({
    id,
    name,
    description,
    isSystem,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.isSystem = isSystem;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
