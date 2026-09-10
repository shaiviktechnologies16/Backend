import { Table, TableForeignKey } from "typeorm";

export class CreateProjects1722084500000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "projects",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "system_prompt",
            type: "text",
            isNullable: true,
          },
          {
            name: "provider",
            type: "varchar",
            length: "50",
            default: "'ollama'",
          },
          {
            name: "model",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "temperature",
            type: "float",
            default: 0.7,
          },
          {
            name: "max_tokens",
            type: "int",
            default: 2048,
          },
          {
            name: "is_default",
            type: "boolean",
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp",
          },
          {
            name: "updated_at",
            type: "timestamp",
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      "projects",
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("projects");
  }
}
