import { Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class CreateAgentTools1722087500000 {
  name = "CreateAgentTools1722087500000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "agent_tools",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "agent_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: false,
          },
          {
            name: "type",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "configuration",
            type: "jsonb",
            isNullable: false,
          },
          {
            name: "enabled",
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

    await queryRunner.createForeignKey(
      "agent_tools",
      new TableForeignKey({
        name: "fk_agent_tools_agent",
        columnNames: ["agent_id"],
        referencedTableName: "agents",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createUniqueConstraint(
      "agent_tools",
      new TableUnique({
        name: "uq_agent_tools_agent_name",
        columnNames: ["agent_id", "name"],
      }),
    );

    await queryRunner.createIndex(
      "agent_tools",
      new TableIndex({
        name: "idx_agent_tools_agent_id",
        columnNames: ["agent_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("agent_tools");
  }
}
