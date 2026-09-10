import { Table } from "typeorm";

export class CreateRoles1722085160000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "roles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
            isUnique: true,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "is_system",
            type: "boolean",
            default: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("roles");
  }
}
