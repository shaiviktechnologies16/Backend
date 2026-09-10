import { EntitySchema } from "typeorm";

export const RolePermissionOrm = new EntitySchema({
  name: "RolePermission",

  tableName: "role_permissions",

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
    role: {
      type: "many-to-one",
      target: "Role",
      joinColumn: {
        name: "role_id",
      },
      nullable: false,
      onDelete: "CASCADE",
    },

    permission: {
      type: "many-to-one",
      target: "Permission",
      joinColumn: {
        name: "permission_id",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
