import { TableColumn } from "typeorm";

export class AddVisitorLimitsToPlanUsage1723000190000 {
  name = "AddVisitorLimitsToPlanUsage1723000190000";

  async up(queryRunner) {
    await queryRunner.addColumn(
      "plan_usage_limits",
      new TableColumn({
        name: "unique_visitors_per_day",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "plan_usage_limits",
      new TableColumn({
        name: "unique_visitors_per_month",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "plan_usage_limits",
      new TableColumn({
        name: "messages_per_visitor_per_day",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "plan_usage_limits",
      new TableColumn({
        name: "messages_per_visitor_per_month",
        type: "int",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn(
      "plan_usage_limits",
      "messages_per_visitor_per_month",
    );

    await queryRunner.dropColumn(
      "plan_usage_limits",
      "messages_per_visitor_per_day",
    );

    await queryRunner.dropColumn(
      "plan_usage_limits",
      "unique_visitors_per_month",
    );

    await queryRunner.dropColumn(
      "plan_usage_limits",
      "unique_visitors_per_day",
    );
  }
}
