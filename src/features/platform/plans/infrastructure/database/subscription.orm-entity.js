import { EntitySchema } from "typeorm";

export const SubscriptionOrmEntity = new EntitySchema({
  name: "Subscription",
  tableName: "subscriptions",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      unique: true,
    },

    planId: {
      name: "plan_id",
      type: "uuid",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
      default: "ACTIVE",
    },

    billingInterval: {
      name: "billing_interval",
      type: "varchar",
      length: 20,
      default: "MONTHLY",
    },

    currentPeriodStart: {
      name: "current_period_start",
      type: "timestamp",
      createDate: true,
    },

    currentPeriodEnd: {
      name: "current_period_end",
      type: "timestamp",
      nullable: true,
    },

    trialEndsAt: {
      name: "trial_ends_at",
      type: "timestamp",
      nullable: true,
    },

    canceledAt: {
      name: "canceled_at",
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
    plan: {
      type: "many-to-one",
      target: "Plan",
      joinColumn: {
        name: "plan_id",
        referencedColumnName: "id",
      },
      inverseSide: "subscriptions",
      onDelete: "SET NULL",
    },

    organization: {
      type: "one-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
  },
});
