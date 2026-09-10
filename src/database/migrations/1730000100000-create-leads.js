import {
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateLeads1730000100000 {
  name = "CreateLeads1730000100000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "leads",
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
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "agent_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "conversation_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "visitor_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "phone",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "email",
            type: "varchar",
            length: "320",
            isNullable: true,
          },
          {
            name: "requirement",
            type: "text",
            isNullable: true,
          },
          {
            name: "source",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: false,
            default: "'{}'::jsonb",
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
      "leads",
      new TableForeignKey({
        name: "fk_leads_organization",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "leads",
      new TableForeignKey({
        name: "fk_leads_project",
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "leads",
      new TableForeignKey({
        name: "fk_leads_agent",
        columnNames: ["agent_id"],
        referencedTableName: "agents",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "leads",
      new TableForeignKey({
        name: "fk_leads_conversation",
        columnNames: ["conversation_id"],
        referencedTableName: "conversations",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createIndex(
      "leads",
      new TableIndex({
        name: "idx_leads_organization_id",
        columnNames: ["organization_id"],
      }),
    );

    await queryRunner.createIndex(
      "leads",
      new TableIndex({
        name: "idx_leads_project_id",
        columnNames: ["project_id"],
      }),
    );

    await queryRunner.createIndex(
      "leads",
      new TableIndex({
        name: "idx_leads_agent_id",
        columnNames: ["agent_id"],
      }),
    );

    await queryRunner.createIndex(
      "leads",
      new TableIndex({
        name: "idx_leads_conversation_visitor",
        columnNames: ["conversation_id", "visitor_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("leads");
  }
}
