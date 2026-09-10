export class CreateConversations1722084000000 {
  async up(queryRunner) {
    await queryRunner.query(`
            CREATE TABLE conversations (
                id UUID PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
            DROP TABLE conversations;
        `);
  }
}
