import { TableColumn } from "typeorm";

export class AddIsActiveToUsers1722086200000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "is_active",
        type: "boolean",
        default: true,
        isNullable: false,
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn("users", "is_active");
  }
}
