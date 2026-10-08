import { Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateWebhooksAndDeliveries1730000600000 {
  name = "CreateWebhooksAndDeliveries1730000600000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "webhooks",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "url",
            type: "varchar",
            length: "2048",
            isNullable: false,
          },
          {
            name: "secret",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "events",
            type: "jsonb",
            default:
              '\'["lead.created", "conversation.ended", "handover.requested"]\'',
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("webhooks", [
      new TableForeignKey({
        name: "fk_webhooks_organization",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createIndex(
      "webhooks",
      new TableIndex({
        name: "idx_webhooks_org_active",
        columnNames: ["organization_id", "is_active"],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "webhook_deliveries",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "webhook_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "event",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "payload",
            type: "jsonb",
            isNullable: false,
          },
          {
            name: "response_status",
            type: "int",
            isNullable: true,
          },
          {
            name: "response_body",
            type: "text",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'SUCCESS'",
          },
          {
            name: "duration_ms",
            type: "int",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("webhook_deliveries", [
      new TableForeignKey({
        name: "fk_webhook_deliveries_webhook",
        columnNames: ["webhook_id"],
        referencedTableName: "webhooks",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createIndex(
      "webhook_deliveries",
      new TableIndex({
        name: "idx_webhook_deliveries_webhook_id",
        columnNames: ["webhook_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("webhook_deliveries");
    await queryRunner.dropTable("webhooks");
  }
}
