import { EntitySchema } from "typeorm";

export const OrganizationOrmEntity = new EntitySchema({
  name: "Organization",
  tableName: "organizations",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    name: {
      type: "varchar",
      length: 255,
    },

    slug: {
      type: "varchar",
      length: 255,
    },

    ownerId: {
      name: "owner_id",
      type: "uuid",
      nullable: true,
    },

    planId: {
      name: "plan_id",
      type: "uuid",
      nullable: true,
    },

    logo: {
      type: "text",
      nullable: true,
    },

    website: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 20,
      default: "ACTIVE",
    },

    monthlyMessageLimit: {
      name: "monthly_message_limit",
      type: "integer",
      default: 1000,
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

    deletedAt: {
      name: "deleted_at",
      type: "timestamp",
      deleteDate: true,
      nullable: true,
    },
  },

  relations: {
    plan: {
      type: "many-to-one",
      target: "Plan",
      joinColumn: {
        name: "plan_id",
        referencedColumnName: "id",
      },
      nullable: true,
      onDelete: "SET NULL",
    },
  },
});
