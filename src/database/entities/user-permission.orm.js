import { EntitySchema } from "typeorm";

export const UserPermissionOrm = new EntitySchema({
  name: "UserPermission",

  tableName: "user_permissions",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
      },
      onDelete: "CASCADE",
    },

    permission: {
      type: "many-to-one",
      target: "Permission",
      joinColumn: {
        name: "permission_id",
      },
      onDelete: "CASCADE",
    },
  },
});
