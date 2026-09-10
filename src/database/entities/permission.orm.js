import { EntitySchema } from "typeorm";

export const PermissionOrm = new EntitySchema({
  name: "Permission",

  tableName: "permissions",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    module: {
      type: "varchar",
      length: 100,
    },

    permissionKey: {
      name: "permission_key",
      type: "varchar",
      length: 150,
      unique: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
    rolePermissions: {
      type: "one-to-many",
      target: "RolePermission",
      inverseSide: "permission",
    },
  },
});
