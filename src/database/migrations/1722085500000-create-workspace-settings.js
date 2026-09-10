export class CreateWorkspaceSettings1722085500000 {
  name = "CreateWorkspaceSettings1722085500000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE workspace_settings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        organization_id uuid NOT NULL UNIQUE,

        assistant_name varchar(255),

        assistant_description text,

        system_prompt text,

        theme_config jsonb,

        feature_flags jsonb,

        created_at timestamp DEFAULT NOW(),

        updated_at timestamp DEFAULT NOW(),

        CONSTRAINT fk_workspace_settings_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE workspace_settings
    `);
  }
}
