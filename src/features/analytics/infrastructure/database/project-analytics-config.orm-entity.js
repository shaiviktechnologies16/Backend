import { EntitySchema } from "typeorm";

export const ProjectAnalyticsConfigOrmEntity = new EntitySchema({
  name: "ProjectAnalyticsConfig",
  tableName: "project_analytics_configs",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    projectId: {
      name: "project_id",
      type: "uuid",
      nullable: false,
      unique: true,
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    trackingKey: {
      name: "tracking_key",
      type: "varchar",
      length: 64,
      nullable: false,
      unique: true,
    },

    isEnabled: {
      name: "is_enabled",
      type: "boolean",
      default: true,
    },

    allowedDomains: {
      name: "allowed_domains",
      type: "text",
      array: true,
      default: "{}",
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
    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
      },
      onDelete: "CASCADE",
    },

    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
      },
      onDelete: "CASCADE",
    },
  },
});

