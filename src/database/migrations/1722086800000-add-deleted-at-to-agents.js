export class AddDeletedAtToAgents1722086800000 {
  name = "AddDeletedAtToAgents1722086800000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN deleted_at TIMESTAMP NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      DROP COLUMN deleted_at;
    `);
  }
}
