import { EntitySchema } from "typeorm";

export const AIModelOrmEntity = new EntitySchema({
  name: "AIModel",

  tableName: "ai_models",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
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

    capability: {
      type: "varchar",
      length: 30,
      nullable: false,
      default: "CHAT",
    },
    displayName: {
      name: "display_name",
      type: "varchar",
      length: 100,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 20,
      default: "ACTIVE",
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
    agents: {
      type: "one-to-many",
      target: "Agent",
      inverseSide: "aiModel",
    },
  },
});
