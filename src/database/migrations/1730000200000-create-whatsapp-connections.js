import {
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateWhatsappConnections1730000200000 {
  name = "CreateWhatsappConnections1730000200000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "whatsapp_connections",
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
            name: "phone_number_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "business_account_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "quality_rating",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "agent_id",
            type: "uuid",
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

    await queryRunner.createForeignKey(
      "whatsapp_connections",
      new TableForeignKey({
        name: "fk_whatsapp_connections_organization",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "whatsapp_connections",
      new TableForeignKey({
        name: "fk_whatsapp_connections_project",
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createForeignKey(
      "whatsapp_connections",
      new TableForeignKey({
        name: "fk_whatsapp_connections_agent",
        columnNames: ["agent_id"],
        referencedTableName: "agents",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createIndex(
      "whatsapp_connections",
      new TableIndex({
        name: "idx_whatsapp_connections_organization_id",
        columnNames: ["organization_id"],
      }),
    );

    await queryRunner.createIndex(
      "whatsapp_connections",
      new TableIndex({
        name: "idx_whatsapp_connections_project_id",
        columnNames: ["project_id"],
      }),
    );

    await queryRunner.createIndex(
      "whatsapp_connections",
      new TableIndex({
        name: "idx_whatsapp_connections_agent_id",
        columnNames: ["agent_id"],
      }),
    );

    await queryRunner.createIndex(
      "whatsapp_connections",
      new TableIndex({
        name: "idx_whatsapp_connections_phone_number_id",
        columnNames: ["phone_number_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("whatsapp_connections");
  }
}
