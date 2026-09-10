import { EntitySchema } from "typeorm";
import { PlatformRole } from "../../features/admin/domain/constants/platform-role.js";

export const UserOrm = new EntitySchema({
  name: "User",

  tableName: "users",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    name: {
      type: "varchar",
      length: 255,
    },

    email: {
      type: "varchar",
      length: 255,
      unique: true,
    },

    passwordHash: {
      name: "password_hash",
      type: "varchar",
      length: 255,
    },

    platformRole: {
      name: "platform_role",
      type: "varchar",
      length: 30,
      default: PlatformRole.USER,
    },

    phone: {
      type: "varchar",
      length: 30,
      nullable: true,
    },

    profilePhotoUploadId: {
      name: "profile_photo_upload_id",
      type: "uuid",
      nullable: true,
    },

    isActive: {
      name: "is_active",
      type: "boolean",
      default: true,
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
    role: {
      type: "many-to-one",
      target: "Role",
      joinColumn: {
        name: "role_id",
      },
      nullable: false,
    },

    conversations: {
      type: "one-to-many",
      target: "Conversation",
      inverseSide: "user",
    },
  },
});
