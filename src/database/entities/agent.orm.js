import { EntitySchema } from "typeorm";

export const AgentOrm = new EntitySchema({
  name: "Agent",
  tableName: "agents",

  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },

    userId: {
      name: "user_id",
      type: "uuid",
      nullable: false,
    },

    projectId: {
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    systemPrompt: {
      name: "system_prompt",
      type: "text",
      nullable: true,
    },

    provider: {
      type: "varchar",
      length: 50,
      default: "ollama",
    },

    model: {
      type: "varchar",
      length: 100,
      nullable: true,
    },

    temperature: {
      type: "float",
      default: 0.7,
    },

    maxTokens: {
      name: "max_tokens",
      type: "int",
      default: 2048,
    },

    isDefault: {
      name: "is_default",
      type: "boolean",
      default: false,
    },

    // Public AI Agent Support
    visibility: {
      type: "varchar",
      length: 20,
      default: "PRIVATE",
    },

    publicKey: {
      name: "public_key",
      type: "varchar",
      length: 100,
      unique: true,
      nullable: true,
    },

    publicEnabledAt: {
      name: "public_enabled_at",
      type: "timestamp",
      nullable: true,
    },

    widgetConfig: {
      name: "widget_config",
      type: "jsonb",
      nullable: false,
      default: {},
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
      },
      onDelete: "CASCADE",
    },

    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
      },
      onDelete: "CASCADE",
    },

    conversations: {
      type: "one-to-many",
      target: "Conversation",
      inverseSide: "agent",
    },
  },
});
