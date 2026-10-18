export class RegisterShaivikTechnologiesTrackingConfig1730001300000 {
  name = "RegisterShaivikTechnologiesTrackingConfig1730001300000";

  async up(queryRunner) {
    // Register or update project tracking config for Shaivik Technologies website project
    // Uses the existing Shaivik Technologies project and organization records
    await queryRunner.query(`
      DO $$
      DECLARE
        v_project_id UUID;
        v_org_id UUID;
      BEGIN
        -- Find the Shaivik Technologies project
        SELECT p.id, p.organization_id INTO v_project_id, v_org_id
        FROM projects p
        WHERE p.id = 'a3a796ff-8c63-4e6e-8a72-6e6b9dcad114'
           OR p.name = 'Customer Support Agent'
        ORDER BY CASE WHEN p.id = 'a3a796ff-8c63-4e6e-8a72-6e6b9dcad114' THEN 0 ELSE 1 END
        LIMIT 1;

        IF v_project_id IS NOT NULL THEN
          INSERT INTO project_analytics_configs (
            project_id,
            organization_id,
            tracking_key,
            allowed_domains,
            is_enabled,
            created_at,
            updated_at
          )
          VALUES (
            v_project_id,
            v_org_id,
            'shv_trk_f9dd72484d5628a271c4f306',
            '{}',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (project_id) DO UPDATE
          SET tracking_key = 'shv_trk_f9dd72484d5628a271c4f306',
              is_enabled = true,
              updated_at = CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner) {
    // Safe revert if ever rolled back
    await queryRunner.query(`
      UPDATE project_analytics_configs
      SET tracking_key = 'shv_trk_3c54ac466d4f1566036d67af',
          updated_at = CURRENT_TIMESTAMP
      WHERE project_id = 'a3a796ff-8c63-4e6e-8a72-6e6b9dcad114'
        AND tracking_key = 'shv_trk_f9dd72484d5628a271c4f306';
    `);
  }
}

