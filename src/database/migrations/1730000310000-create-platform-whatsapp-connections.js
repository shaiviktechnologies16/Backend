import { Table, TableIndex } from "typeorm";

export class CreatePlatformWhatsappConnections1730000310000 {
  name = "CreatePlatformWhatsappConnections1730000310000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "platform_whatsapp_connections",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "provider",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "phone_number",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            isNullable: false,
            default: "'PENDING'",
          },
          {
            name: "quality_rating",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "credentials",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: false,
            default: "'{}'::jsonb",
          },
          {
            name: "last_connected_at",
            type: "timestamp",
            isNullable: true,
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

    await queryRunner.createIndex(
      "platform_whatsapp_connections",
      new TableIndex({
        name: "idx_platform_whatsapp_connections_provider",
        columnNames: ["provider"],
      }),
    );

    await queryRunner.createIndex(
      "platform_whatsapp_connections",
      new TableIndex({
        name: "idx_platform_whatsapp_connections_status",
        columnNames: ["status"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("platform_whatsapp_connections");
  }
}
