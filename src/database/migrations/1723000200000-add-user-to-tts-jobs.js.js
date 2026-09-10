import { TableColumn, TableForeignKey } from "typeorm";

export class AddUserToTtsJobs1723000200000 {
  name = "AddUserToTtsJobs1723000200000";

  async up(queryRunner) {
    await queryRunner.addColumn(
      "tts_jobs",
      new TableColumn({
        name: "user_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "tts_jobs",
      new TableForeignKey({
        name: "FK_tts_jobs_user_id",
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropForeignKey("tts_jobs", "FK_tts_jobs_user_id");

    await queryRunner.dropColumn("tts_jobs", "user_id");
  }
}
