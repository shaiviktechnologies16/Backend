import { EntitySchema } from "typeorm";

export const AISettingsOrmEntity = new EntitySchema({
  name: "AISettings",

  tableName: "organization_ai_settings",

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

    defaultInstructions: {
      name: "default_instructions",
      type: "text",
      nullable: true,
    },

    conversationRules: {
      name: "conversation_rules",
      type: "text",
      nullable: true,
    },

    tone: {
      type: "varchar",
      length: 50,
      default: "'professional'",
    },

    responseStyle: {
      name: "response_style",
      type: "varchar",
      length: 50,
      default: "'balanced'",
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
});
