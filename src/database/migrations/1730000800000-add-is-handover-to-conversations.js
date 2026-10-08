export class AddIsHandoverToConversations1730000800000 {
  name = "AddIsHandoverToConversations1730000800000";

  async up(queryRunner) {
    const hasConversations = await queryRunner.hasTable("conversations");

    if (hasConversations) {
      await queryRunner.query(`
        ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS is_handover boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS handover_requested_at timestamp;
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_conversations_handover
        ON conversations(is_handover);
      `);
    }
  }

  async down(queryRunner) {
    const hasConversations = await queryRunner.hasTable("conversations");

    if (hasConversations) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_conversations_handover;
      `);

      await queryRunner.query(`
        ALTER TABLE conversations
        DROP COLUMN IF EXISTS handover_requested_at,
        DROP COLUMN IF EXISTS is_handover;
      `);
    }
  }
}
