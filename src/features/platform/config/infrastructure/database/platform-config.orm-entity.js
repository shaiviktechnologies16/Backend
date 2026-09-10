import { EntitySchema } from "typeorm";

export const PlatformConfigOrmEntity = new EntitySchema({
  name: "PlatformConfig",
  tableName: "platform_configs",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    configKey: {
      name: "config_key",
      type: "varchar",
      length: 100,
      unique: true,
    },

    configValue: {
      name: "config_value",
      type: "text",
      nullable: true,
    },

    isSecret: {
      name: "is_secret",
      type: "boolean",
      default: false,
    },

    description: {
      type: "text",
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
});
