import { EntitySchema } from "typeorm";

export const OrganizationMemberOrmEntity = new EntitySchema({
  name: "OrganizationMember",
  tableName: "organization_members",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
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
      length: 20,
    },

    invitedBy: {
      name: "invited_by",
      type: "uuid",
      nullable: true,
    },

    joinedAt: {
      name: "joined_at",
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },

    status: {
      type: "varchar",
      length: 20,
      default: "'ACTIVE'",
    },

    removedAt: {
      name: "removed_at",
      type: "timestamp",
      nullable: true,
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
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
      },
      eager: false,
    },
  },
});
