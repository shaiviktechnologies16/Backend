export class PermissionEntity {
  constructor({
    id,
    module,
    permissionKey,
    description,
  }) {
    this.id = id;
    this.module = module;
    this.permissionKey = permissionKey;
    this.description = description;
  }
}
