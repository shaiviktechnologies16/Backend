import { Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateRolePermissions1722085170000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "role_permissions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "role_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "permission_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("role_permissions", [
      new TableForeignKey({
        name: "fk_role_permissions_role",
        columnNames: ["role_id"],
        referencedTableName: "roles",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        name: "fk_role_permissions_permission",
        columnNames: ["permission_id"],
        referencedTableName: "permissions",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createUniqueConstraint(
      "role_permissions",
      new TableUnique({
        name: "uq_role_permission",
        columnNames: ["role_id", "permission_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("role_permissions");
  }
}
