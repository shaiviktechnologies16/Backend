export class BackfillWorkspaceSettings1722085600000 {
  name = "BackfillWorkspaceSettings1722085600000";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO workspace_settings
      (
        id,
        organization_id,
        assistant_name,
        theme_config,
        feature_flags,
        created_at,
        updated_at
      )
      SELECT
        uuid_generate_v4(),
        id,
        'AI Assistant',
        '{}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW()
      FROM organizations
      WHERE id NOT IN (
        SELECT organization_id
        FROM workspace_settings
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM workspace_settings
      WHERE assistant_name = 'AI Assistant';
    `);
  }
}
