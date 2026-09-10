export class CreateUsage1723000150000 {
  name = "CreateUsage1723000150000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        agent_id UUID NOT NULL,
        conversation_id UUID NOT NULL,

        visitor_id VARCHAR(100) NULL,

        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,

        response_time_ms INTEGER NOT NULL DEFAULT 0,

        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        error_code VARCHAR(100) NULL,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_usage_agent
          FOREIGN KEY (agent_id)
          REFERENCES agents(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_usage_conversation
          FOREIGN KEY (conversation_id)
          REFERENCES conversations(id)
          ON DELETE CASCADE
      );

      CREATE INDEX idx_usage_agent_id
        ON usage(agent_id);

      CREATE INDEX idx_usage_conversation_id
        ON usage(conversation_id);

      CREATE INDEX idx_usage_visitor_created_at
        ON usage(visitor_id, created_at);

      CREATE INDEX idx_usage_agent_created_at
        ON usage(agent_id, created_at);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS usage;
    `);
  }
}
