import { TableColumn, TableForeignKey } from "typeorm";

export class AddPlanToOrganizations1723000180000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "organizations",
      new TableColumn({
        name: "plan_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "organizations",
      new TableForeignKey({
        columnNames: ["plan_id"],
        referencedTableName: "plans",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  async down(queryRunner) {
    const table = await queryRunner.getTable("organizations");

    const foreignKey = table.foreignKeys.find((key) =>
      key.columnNames.includes("plan_id"),
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey("organizations", foreignKey);
    }

    await queryRunner.dropColumn("organizations", "plan_id");
  }
}
