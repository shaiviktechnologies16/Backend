import { EntitySchema } from "typeorm";

export const PlanOrmEntity = new EntitySchema({
  name: "Plan",
  tableName: "plans",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    name: {
      type: "varchar",
      length: 100,
    },

    code: {
      type: "varchar",
      length: 50,
      unique: true,
    },

    slug: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    priceMonthly: {
      name: "price_monthly",
      type: "numeric",
      default: 0,
    },

    priceYearly: {
      name: "price_yearly",
      type: "numeric",
      default: 0,
    },

    currency: {
      type: "varchar",
      length: 10,
      default: "USD",
    },

    displayOrder: {
      name: "display_order",
      type: "integer",
      default: 0,
    },

    isActive: {
      name: "is_active",
      type: "boolean",
      default: true,
    },

    isPublic: {
      name: "is_public",
      type: "boolean",
      default: true,
    },

    isDefault: {
      name: "is_default",
      type: "boolean",
      default: false,
    },

    isArchived: {
      name: "is_archived",
      type: "boolean",
      default: false,
    },

    trialEnabled: {
      name: "trial_enabled",
      type: "boolean",
      default: false,
    },

    trialDays: {
      name: "trial_days",
      type: "integer",
      default: 0,
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
    organizations: {
      type: "one-to-many",
      target: "Organization",
      inverseSide: "plan",
    },

    usageLimit: {
      type: "one-to-one",
      target: "PlanUsageLimit",
      inverseSide: "plan",
    },

    features: {
      type: "one-to-many",
      target: "PlanFeature",
      inverseSide: "plan",
    },

    subscriptions: {
      type: "one-to-many",
      target: "Subscription",
      inverseSide: "plan",
    },
  },
});
