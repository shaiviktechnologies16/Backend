import { TableColumn } from "typeorm";

export class AddPlatformRoleToUsers1722085100000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "platform_role",
        type: "varchar",
        length: "30",
        isNullable: false,
        default: "'USER'",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn("users", "platform_role");
  }
}
