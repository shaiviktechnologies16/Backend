import { TableColumn } from "typeorm";

export class AddAIModelCapability1722087400000 {
  name = "AddAIModelCapability1722087400000";

  async up(queryRunner) {
    await queryRunner.addColumn(
      "ai_models",
      new TableColumn({
        name: "capability",
        type: "varchar",
        length: "30",
        isNullable: false,
        default: "'CHAT'",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn("ai_models", "capability");
  }
}
