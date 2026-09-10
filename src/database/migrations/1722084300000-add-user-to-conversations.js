export class AddUserToConversations1722084400000 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN user_id UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD CONSTRAINT fk_conversation_user
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE conversations
      DROP CONSTRAINT fk_conversation_user;
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN user_id;
    `);
  }
}
