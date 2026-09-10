import { TableColumn, TableForeignKey } from "typeorm";

export class AddAIModelToAgents1722155000000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "agents",
      new TableColumn({
        name: "ai_model_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE agents
      SET ai_model_id = 'b722a8e6-7a9a-444e-80d8-c3fe8c1cee13'
      WHERE ai_model_id IS NULL
    `);

    await queryRunner.changeColumn(
      "agents",
      "ai_model_id",
      new TableColumn({
        name: "ai_model_id",
        type: "uuid",
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      "agents",
      new TableForeignKey({
        name: "FK_agents_ai_model",
        columnNames: ["ai_model_id"],
        referencedTableName: "ai_models",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropForeignKey("agents", "FK_agents_ai_model");

    await queryRunner.dropColumn("agents", "ai_model_id");
  }
}
