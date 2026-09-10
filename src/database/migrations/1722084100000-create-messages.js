export class CreateMessages1722084100000 {
  async up(queryRunner) {
    await queryRunner.query(`
            CREATE TABLE messages (
                id UUID PRIMARY KEY,
                conversation_id UUID NOT NULL,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,

                CONSTRAINT fk_messages_conversation
                FOREIGN KEY (conversation_id)
                REFERENCES conversations(id)
                ON DELETE CASCADE
            );
        `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
            DROP TABLE messages;
        `);
  }
}
