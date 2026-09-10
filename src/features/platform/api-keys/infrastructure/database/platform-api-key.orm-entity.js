import { EntitySchema } from "typeorm";

export const PlatformApiKeyOrmEntity = new EntitySchema({
  name: "PlatformApiKey",
  tableName: "platform_api_keys",

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

    name: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    encryptedValue: {
      propertyName: "encryptedValue",
      name: "encrypted_value",
      type: "text",
      nullable: false,
    },

    isActive: {
      propertyName: "isActive",
      name: "is_active",
      type: "boolean",
      default: true,
    },

    createdBy: {
      propertyName: "createdBy",
      name: "created_by",
      type: "uuid",
      nullable: false,
    },

    createdAt: {
      propertyName: "createdAt",
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      propertyName: "updatedAt",
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },

  relations: {
    createdByUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "created_by",
        referencedColumnName: "id",
      },
      onDelete: "RESTRICT",
    },
  },
});
