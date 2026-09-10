export class AddProjectTimestampDefaults1722151000000 {
  name = "AddWorkspaceFieldsToConversations1722085300000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN visitor_id varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN project_id uuid
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD CONSTRAINT fk_conversations_project
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX idx_conversations_project_id
      ON conversations(project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_conversations_visitor_id
      ON conversations(visitor_id)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX idx_conversations_visitor_id
    `);

    await queryRunner.query(`
      DROP INDEX idx_conversations_project_id
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP CONSTRAINT fk_conversations_project
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN project_id
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN visitor_id
    `);
  }
}
