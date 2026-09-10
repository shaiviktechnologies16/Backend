import { Table, TableForeignKey } from "typeorm";

export class CreateProjectMembers1722086700000 {
  name = "CreateProjectMembers1722086700000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "project_members",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "role",
            type: "varchar",
            length: "50",
            default: "'MEMBER'",
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            default: "'ACTIVE'",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "removed_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("project_members", [
      new TableForeignKey({
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);
  }

  async down(queryRunner) {
    await queryRunner.dropTable("project_members");
  }
}
