export class AddProjectRelationToAgents1722085000000 {
  name = "AddProjectRelationToAgents1722085000000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN project_id uuid
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN visibility varchar(20) NOT NULL DEFAULT 'PRIVATE'
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN public_key varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN widget_config jsonb NOT NULL DEFAULT '{}'
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD CONSTRAINT fk_agents_project
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX idx_agents_project_id
      ON agents(project_id)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX idx_agents_project_id
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      DROP CONSTRAINT fk_agents_project
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      DROP COLUMN widget_config,
      DROP COLUMN public_key,
      DROP COLUMN visibility,
      DROP COLUMN project_id
    `);
  }
}
