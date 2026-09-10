import { Table } from "typeorm";

export class CreatePermissions1722085150000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "permissions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "module",
            type: "varchar",
            length: "100",
          },
          {
            name: "permission_key",
            type: "varchar",
            length: "150",
            isUnique: true,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("permissions");
  }
}
