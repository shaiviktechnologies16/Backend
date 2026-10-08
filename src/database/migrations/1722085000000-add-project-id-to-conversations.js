export class AddProjectRelationToAgents1722085000000 {
  name = "AddProjectRelationToAgents1722085000000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS project_id uuid
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS visibility varchar(20) NOT NULL DEFAULT 'PRIVATE'
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS public_key varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS widget_config jsonb NOT NULL DEFAULT '{}'
    `);

    const hasProjects = await queryRunner.hasTable("projects");
    if (hasProjects) {
      await queryRunner.query(`
        ALTER TABLE agents
        ADD CONSTRAINT fk_agents_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_project_id
      ON agents(project_id)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_agents_project_id
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      DROP CONSTRAINT IF EXISTS fk_agents_project
    `);

    await queryRunner.query(`
      ALTER TABLE agents
      DROP COLUMN IF EXISTS widget_config,
      DROP COLUMN IF EXISTS public_key,
      DROP COLUMN IF EXISTS visibility,
      DROP COLUMN IF EXISTS project_id
    `);
  }
}
