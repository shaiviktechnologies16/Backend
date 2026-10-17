import { EntitySchema } from "typeorm";

export const ProjectVisitorEventOrmEntity = new EntitySchema({
  name: "ProjectVisitorEvent",
  tableName: "project_visitor_events",

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
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    eventType: {
      name: "event_type",
      type: "varchar",
      length: 32,
      default: "pageview",
    },

    visitorId: {
      name: "visitor_id",
      type: "varchar",
      length: 128,
      nullable: false,
    },

    sessionId: {
      name: "session_id",
      type: "varchar",
      length: 128,
      nullable: false,
    },

    pagePath: {
      name: "page_path",
      type: "varchar",
      length: 1024,
      nullable: false,
    },

    pageTitle: {
      name: "page_title",
      type: "varchar",
      length: 512,
      nullable: true,
    },

    referrer: {
      type: "varchar",
      length: 1024,
      nullable: true,
    },

    referrerSource: {
      name: "referrer_source",
      type: "varchar",
      length: 128,
      nullable: true,
    },

    deviceCategory: {
      name: "device_category",
      type: "varchar",
      length: 32,
      nullable: true,
    },

    browser: {
      type: "varchar",
      length: 64,
      nullable: true,
    },

    os: {
      type: "varchar",
      length: 64,
      nullable: true,
    },

    country: {
      type: "varchar",
      length: 64,
      nullable: true,
    },

    durationSeconds: {
      name: "duration_seconds",
      type: "int",
      default: 0,
    },

    isNewVisitor: {
      name: "is_new_visitor",
      type: "boolean",
      default: false,
    },

    metadata: {
      type: "jsonb",
      default: "{}",
    },

    createdAt: {
      name: "created_at",
      type: "timestamp with time zone",
      createDate: true,
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

