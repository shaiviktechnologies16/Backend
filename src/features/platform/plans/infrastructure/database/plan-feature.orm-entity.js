import { EntitySchema } from "typeorm";

export const PlanFeatureOrmEntity = new EntitySchema({
  name: "PlanFeature",
  tableName: "plan_features",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    planId: {
      name: "plan_id",
      type: "uuid",
    },

    featureKey: {
      name: "feature_key",
      type: "varchar",
      length: 100,
    },

    isEnabled: {
      name: "is_enabled",
      type: "boolean",
      default: true,
    },

    config: {
      type: "text",
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
      inverseSide: "features",
      onDelete: "CASCADE",
    },
  },
});
