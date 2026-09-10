import { EntitySchema } from "typeorm";

export const AgentOrmEntity = new EntitySchema({
  name: "Agent",

  tableName: "agents",

  columns: {
    id: {
      type: "uuid",
      primary: true,
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

    aiModelId: {
      propertyName: "aiModelId",
      name: "ai_model_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    systemPrompt: {
      name: "system_prompt",
      type: "text",
      default: "",
    },

    provider: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    model: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    temperature: {
      type: "float",
      nullable: false,
    },

    maxTokens: {
      name: "max_tokens",
      type: "int",
      nullable: false,
    },

    isDefault: {
      name: "is_default",
      type: "boolean",
      default: false,
    },

    visibility: {
      type: "varchar",
      length: 20,
      nullable: false,
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

    deletedAt: {
      name: "deleted_at",
      type: "timestamp",
      nullable: true,
      deleteDate: true,
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

    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
      },
      onDelete: "CASCADE",
    },

    aiModel: {
      type: "many-to-one",
      target: "AIModel",
      joinColumn: {
        name: "ai_model_id",
        referencedColumnName: "id",
      },
      onDelete: "RESTRICT",
    },
  },
});
