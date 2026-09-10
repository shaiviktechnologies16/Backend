import { EntitySchema } from "typeorm";

export const LeadOrmEntity = new EntitySchema({
  name: "Lead",
  tableName: "leads",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      propertyName: "organizationId",
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    agentId: {
      propertyName: "agentId",
      name: "agent_id",
      type: "uuid",
      nullable: false,
    },

    conversationId: {
      propertyName: "conversationId",
      name: "conversation_id",
      type: "uuid",
      nullable: true,
    },

    visitorId: {
      propertyName: "visitorId",
      name: "visitor_id",
      type: "uuid",
      nullable: true,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    phone: {
      type: "varchar",
      length: 50,
      nullable: true,
    },

    email: {
      type: "varchar",
      length: 320,
      nullable: true,
    },

    requirement: {
      type: "text",
      nullable: true,
    },

    source: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    metadata: {
      type: "jsonb",
      nullable: false,
      default: {},
    },

    createdAt: {
      propertyName: "createdAt",
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      propertyName: "updatedAt",
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
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },

    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },

    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },

    conversation: {
      type: "many-to-one",
      target: "Conversation",
      joinColumn: {
        name: "conversation_id",
        referencedColumnName: "id",
      },
      onDelete: "SET NULL",
    },
  },
});
