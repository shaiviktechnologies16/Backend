import { EntitySchema } from "typeorm";

export const AdminSessionOrm = new EntitySchema({
  name: "AdminSession",
  tableName: "admin_sessions",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    refreshTokenHash: {
      type: String,
      name: "refresh_token_hash",
      unique: true,
    },

    userAgent: {
      type: String,
      nullable: true,
      name: "user_agent",
    },

    ipAddress: {
      type: String,
      nullable: true,
      name: "ip_address",
    },

    expiresAt: {
      type: Date,
      name: "expires_at",
    },

    createdAt: {
      type: Date,
      name: "created_at",
      createDate: true,
    },

    updatedAt: {
      type: Date,
      name: "updated_at",
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
  },
});
