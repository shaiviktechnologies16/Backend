import { TableColumn } from "typeorm";

export class AddMonthlyMessageLimitToOrganizations1730000000000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "organizations",
      new TableColumn({
        name: "monthly_message_limit",
        type: "integer",
        default: 1000,
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn("organizations", "monthly_message_limit");
  }
}
