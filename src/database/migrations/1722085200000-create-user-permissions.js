import { Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateUserPermissions1722085200000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "user_permissions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "user_id",
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

    await queryRunner.createForeignKeys("user_permissions", [
      new TableForeignKey({
        name: "fk_user_permissions_user",
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),

      new TableForeignKey({
        name: "fk_user_permissions_permission",
        columnNames: ["permission_id"],
        referencedTableName: "permissions",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createUniqueConstraint(
      "user_permissions",
      new TableUnique({
        name: "uq_user_permission",
        columnNames: ["user_id", "permission_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("user_permissions");
  }
}
