import { EntitySchema } from "typeorm";

export const MessageOrm = new EntitySchema({
  name: "Message",
  tableName: "messages",

  columns: {
    id: {
      type: String,
      primary: true,
    },

    role: {
      type: String,
    },

    content: {
      type: "text",
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
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
