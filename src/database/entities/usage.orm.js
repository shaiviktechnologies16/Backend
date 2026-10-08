import { EntitySchema } from "typeorm";

export const UsageOrm = new EntitySchema({
  name: "Usage",
  tableName: "usage",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    agentId: {
      name: "agent_id",
      type: "uuid",
      nullable: false,
    },

    conversationId: {
      name: "conversation_id",
      type: "uuid",
      nullable: false,
    },

    visitorId: {
      name: "visitor_id",
      type: "varchar",
      length: 100,
      nullable: true,
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: true,
    },

    networkIdentityHash: {
      name: "network_identity_hash",
      type: "varchar",
      length: 64,
      nullable: true,
    },

    modelName: {
      name: "model_name",
      type: "varchar",
      length: 100,
      nullable: true,
    },

    costUsd: {
      name: "cost_usd",
      type: "numeric",
      precision: 10,
      scale: 6,
      default: 0,
    },

    inputTokens: {
      name: "input_tokens",
      type: "int",
      default: 0,
    },

    outputTokens: {
      name: "output_tokens",
      type: "int",
      default: 0,
    },

    totalTokens: {
      name: "total_tokens",
      type: "int",
      default: 0,
    },

    responseTimeMs: {
      name: "response_time_ms",
      type: "int",
      default: 0,
    },

    status: {
      type: "varchar",
      length: 20,
      default: "SUCCESS",
    },

    errorCode: {
      name: "error_code",
      type: "varchar",
      length: 100,
      nullable: true,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
      },
      nullable: false,
      onDelete: "CASCADE",
    },

    conversation: {
      type: "many-to-one",
      target: "Conversation",
      joinColumn: {
        name: "conversation_id",
      },
      nullable: false,
      onDelete: "CASCADE",
    },
  },
});
