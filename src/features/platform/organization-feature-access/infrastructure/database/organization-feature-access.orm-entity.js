import { EntitySchema } from "typeorm";

export const OrganizationFeatureAccessOrmEntity = new EntitySchema({
  name: "OrganizationFeatureAccess",
  tableName: "organization_feature_access",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    feature: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    enabled: {
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
    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
      },
      onDelete: "CASCADE",
    },
  },

  uniques: [
    {
      name: "UQ_ORGANIZATION_FEATURE_ACCESS",
      columns: ["organizationId", "feature"],
    },
  ],
});
