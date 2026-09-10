import { EntitySchema } from "typeorm";

export const PlanUsageLimitOrmEntity = new EntitySchema({
  name: "PlanUsageLimit",
  tableName: "plan_usage_limits",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    planId: {
      name: "plan_id",
      type: "uuid",
      unique: true,
    },

    maxProjects: {
      name: "max_projects",
      type: "integer",
      nullable: true,
    },

    maxAgents: {
      name: "max_agents",
      type: "integer",
      nullable: true,
    },

    maxKnowledgeBases: {
      name: "max_knowledge_bases",
      type: "integer",
      nullable: true,
    },

    maxKnowledgeDocuments: {
      name: "max_knowledge_documents",
      type: "integer",
      nullable: true,
    },

    monthlyAiCredits: {
      name: "monthly_ai_credits",
      type: "integer",
      nullable: true,
    },

    maxTeamMembers: {
      name: "max_team_members",
      type: "integer",
      nullable: true,
    },

    maxWhatsappConnections: {
      name: "max_whatsapp_connections",
      type: "integer",
      nullable: true,
    },

    voiceAiMinutes: {
      name: "voice_ai_minutes",
      type: "integer",
      nullable: true,
    },

    requestsPerDay: {
      name: "requests_per_day",
      type: "integer",
      nullable: true,
    },

    requestsPerMonth: {
      name: "requests_per_month",
      type: "integer",
      nullable: true,
    },

    tokensPerDay: {
      name: "tokens_per_day",
      type: "integer",
      nullable: true,
    },

    tokensPerMonth: {
      name: "tokens_per_month",
      type: "integer",
      nullable: true,
    },

    conversationsPerDay: {
      name: "conversations_per_day",
      type: "integer",
      nullable: true,
    },

    conversationsPerMonth: {
      name: "conversations_per_month",
      type: "integer",
      nullable: true,
    },

    uniqueVisitorsPerDay: {
      name: "unique_visitors_per_day",
      type: "integer",
      nullable: true,
    },

    uniqueVisitorsPerMonth: {
      name: "unique_visitors_per_month",
      type: "integer",
      nullable: true,
    },

    messagesPerVisitorPerDay: {
      name: "messages_per_visitor_per_day",
      type: "integer",
      nullable: true,
    },

    messagesPerVisitorPerMonth: {
      name: "messages_per_visitor_per_month",
      type: "integer",
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
      type: "one-to-one",
      target: "Plan",
      joinColumn: {
        name: "plan_id",
        referencedColumnName: "id",
      },
      inverseSide: "usageLimit",
      onDelete: "CASCADE",
    },
  },
});
