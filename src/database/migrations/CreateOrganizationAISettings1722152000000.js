import { Table, TableForeignKey } from "typeorm";

export class CreateOrganizationAISettings1722152000000 {
  name = "CreateOrganizationAISettings1722151000000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organization_ai_settings",
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
            name: "default_instructions",
            type: "text",
            isNullable: true,
          },
          {
            name: "conversation_rules",
            type: "text",
            isNullable: true,
          },
          {
            name: "tone",
            type: "varchar",
            length: "50",
            default: "'professional'",
          },
          {
            name: "response_style",
            type: "varchar",
            length: "50",
            default: "'balanced'",
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
      "organization_ai_settings",
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("organization_ai_settings");
  }
}
