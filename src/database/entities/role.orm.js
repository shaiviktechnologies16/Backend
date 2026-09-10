import { EntitySchema } from "typeorm";

export const RoleOrm = new EntitySchema({
  name: "Role",

  tableName: "roles",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    name: {
      type: "varchar",
      length: 100,
      unique: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    isSystem: {
      name: "is_system",
      type: "boolean",
      default: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },

  relations: {
    users: {
      type: "one-to-many",
      target: "User",
      inverseSide: "role",
    },

    rolePermissions: {
      type: "one-to-many",
      target: "RolePermission",
      inverseSide: "role",
    },
  },
});
