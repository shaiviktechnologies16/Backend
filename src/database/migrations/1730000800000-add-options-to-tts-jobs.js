import { TableColumn } from "typeorm";

export class AddOptionsToTtsJobs1730000800000 {
  name = "AddOptionsToTtsJobs1730000800000";

  async up(queryRunner) {
    const table = await queryRunner.getTable("tts_jobs");
    if (table) {
      const existingColumn = table.findColumnByName("options");
      if (!existingColumn) {
        await queryRunner.addColumn(
          "tts_jobs",
          new TableColumn({
            name: "options",
            type: "jsonb",
            isNullable: true,
          }),
        );
      }
    }
  }

  async down(queryRunner) {
    const table = await queryRunner.getTable("tts_jobs");
    if (table) {
      const existingColumn = table.findColumnByName("options");
      if (existingColumn) {
        await queryRunner.dropColumn("tts_jobs", "options");
      }
    }
  }
}
