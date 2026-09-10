import { EntitySchema } from "typeorm";

export const ConversationOrm = new EntitySchema({
  name: "Conversation",
  tableName: "conversations",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    userId: {
      name: "user_id",
      type: "uuid",
      nullable: true,
    },

    visitorId: {
      name: "visitor_id",
      type: "varchar",
      length: 100,
      nullable: true,
    },

    agentId: {
      name: "agent_id",
      type: "uuid",
      nullable: false,
    },

    projectId: {
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    title: {
      type: "varchar",
      length: 255,
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
      nullable: true,
      onDelete: "CASCADE",
    },

    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
      },
      nullable: false,
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

    messages: {
      type: "one-to-many",
      target: "Message",
      inverseSide: "conversation",
      cascade: true,
    },
  },
});
