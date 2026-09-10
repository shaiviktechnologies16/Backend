import { EntitySchema } from "typeorm";

export const WorkspaceMemberOrmEntity = new EntitySchema({
  name: "WorkspaceMember",
  tableName: "organization_members",

  columns: {
    id: {
      type: "uuid",
      primary: true,
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
    },

    userId: {
      name: "user_id",
      type: "uuid",
    },

    role: {
      type: "varchar",
      length: 50,
    },

    invitedBy: {
      name: "invited_by",
      type: "uuid",
      nullable: true,
    },

    joinedAt: {
      name: "joined_at",
      type: "timestamp",
      nullable: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
    },
    status: {
      type: "varchar",
      length: 20,
      default: "ACTIVE",
    },

    removedAt: {
      name: "removed_at",
      type: "timestamp",
      nullable: true,
    },
  },
});
