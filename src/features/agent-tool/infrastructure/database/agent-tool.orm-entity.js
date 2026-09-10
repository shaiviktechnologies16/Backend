import { EntitySchema } from "typeorm";

export const AgentToolOrmEntity = new EntitySchema({
  name: "AgentTool",
  tableName: "agent_tools",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    agentId: {
      propertyName: "agentId",
      name: "agent_id",
      type: "uuid",
      nullable: false,
    },

    credentialId: {
      propertyName: "credentialId",
      name: "credential_id",
      type: "uuid",
      nullable: true,
    },

    name: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: false,
    },

    type: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    configuration: {
      type: "jsonb",
      nullable: false,
    },

    enabled: {
      type: "boolean",
      default: true,
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
    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
    credential: {
      type: "many-to-one",
      target: "WorkspaceApiKey",
      joinColumn: {
        name: "credential_id",
        referencedColumnName: "id",
      },
      onDelete: "SET NULL",
    },
  },
});
