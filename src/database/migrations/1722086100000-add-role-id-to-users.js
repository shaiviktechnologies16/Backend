import { TableColumn, TableForeignKey } from "typeorm";

export class AddRoleIdToUsers1722086100000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "role_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        name: "fk_users_role",
        columnNames: ["role_id"],
        referencedTableName: "roles",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.query(`
      UPDATE users
      SET role_id = (
        SELECT id
        FROM roles
        WHERE name = 'PLATFORM_ADMIN'
        LIMIT 1
      )
      WHERE platform_role = 'ADMIN';
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN role_id SET NOT NULL;
    `);
  }

  async down(queryRunner) {
    const table = await queryRunner.getTable("users");

    const foreignKey = table.foreignKeys.find(
      (fk) => fk.name === "fk_users_role",
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey("users", foreignKey);
    }

    await queryRunner.dropColumn("users", "role_id");
  }
}
