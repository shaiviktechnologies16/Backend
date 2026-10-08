import { EntitySchema } from "typeorm";

export const WebhookDeliveryOrmEntity = new EntitySchema({
  name: "WebhookDelivery",
  tableName: "webhook_deliveries",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    webhookId: {
      type: "uuid",
      name: "webhook_id",
    },
    event: {
      type: "varchar",
      length: 100,
    },
    payload: {
      type: "jsonb",
    },
    responseStatus: {
      type: "int",
      name: "response_status",
      nullable: true,
    },
    responseBody: {
      type: "text",
      name: "response_body",
      nullable: true,
    },
    status: {
      type: "varchar",
      length: 50,
      default: "SUCCESS",
    },
    durationMs: {
      type: "int",
      name: "duration_ms",
      nullable: true,
    },
    createdAt: {
      type: "timestamp",
      name: "created_at",
      createDate: true,
    },
  },
  relations: {
    webhook: {
      type: "many-to-one",
      target: "Webhook",
      joinColumn: {
        name: "webhook_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
  },
});
