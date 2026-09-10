import { EntitySchema } from "typeorm";

export const PlatformWhatsappConnectionOrmEntity = new EntitySchema({
  name: "PlatformWhatsappConnection",
  tableName: "platform_whatsapp_connections",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    provider: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    phoneNumber: {
      propertyName: "phoneNumber",
      name: "phone_number",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "'PENDING'",
    },

    qualityRating: {
      propertyName: "qualityRating",
      name: "quality_rating",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    credentials: {
      type: "jsonb",
      nullable: true,
    },

    metadata: {
      type: "jsonb",
      nullable: false,
      default: "'{}'::jsonb",
    },

    lastConnectedAt: {
      propertyName: "lastConnectedAt",
      name: "last_connected_at",
      type: "timestamp",
      nullable: true,
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
});
