export class AssignKnowledgePermissions1722087200000 {
  name = "AssignKnowledgePermissions1722087200000";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO role_permissions (
        id,
        role_id,
        permission_id,
        created_at
      )
      SELECT
        gen_random_uuid(),
        r.id,
        p.id,
        NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'WORKSPACE_OWNER'
        AND p.permission_key IN (
          'knowledge.view',
          'knowledge.create',
          'knowledge.update',
          'knowledge.delete'
        )
      ON CONFLICT (role_id, permission_id)
      DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id = (
        SELECT id
        FROM roles
        WHERE name = 'WORKSPACE_OWNER'
      )
      AND permission_id IN (
        SELECT id
        FROM permissions
        WHERE permission_key IN (
          'knowledge.view',
          'knowledge.create',
          'knowledge.update',
          'knowledge.delete'
        )
      )
    `);
  }
}
