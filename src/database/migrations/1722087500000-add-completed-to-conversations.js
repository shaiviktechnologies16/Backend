export class AddCompletedToConversations1722087500000 {
  name = "AddCompletedToConversations1722087500000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS completed_at timestamp
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS completed_by uuid
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN IF EXISTS completed_by
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN IF EXISTS completed_at
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN IF EXISTS is_completed
    `);
  }
}
