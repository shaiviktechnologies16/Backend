export class AddProjectTimestampDefaults1722150000000 {
  name = "AddProjectTimestampDefaults1722150000000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      ALTER COLUMN created_at SET DEFAULT NOW();
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ALTER COLUMN updated_at SET DEFAULT NOW();
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      ALTER COLUMN created_at DROP DEFAULT;
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ALTER COLUMN updated_at DROP DEFAULT;
    `);
  }
}
