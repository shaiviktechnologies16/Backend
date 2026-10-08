import { EntitySchema } from "typeorm";

export const WebhookOrmEntity = new EntitySchema({
  name: "Webhook",
  tableName: "webhooks",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    organizationId: {
      type: "uuid",
      name: "organization_id",
    },
    url: {
      type: "varchar",
      length: 2048,
    },
    secret: {
      type: "varchar",
      length: 255,
    },
    events: {
      type: "jsonb",
    },
    isActive: {
      type: "boolean",
      name: "is_active",
      default: true,
    },
    createdAt: {
      type: "timestamp",
      name: "created_at",
      createDate: true,
    },
    updatedAt: {
      type: "timestamp",
      name: "updated_at",
      updateDate: true,
    },
  },
  relations: {
    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
  },
});
