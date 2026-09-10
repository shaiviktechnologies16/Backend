import { v4 as uuid } from "uuid";

export class SeedPlatformTtsPermission1722086200000 {
  name = "SeedPlatformTtsPermission1722086200000";

  async up(queryRunner) {
    const permissionId = uuid();

    await queryRunner.query(
      `
      INSERT INTO permissions
      (
        id,
        module,
        permission_key,
        description,
        created_at
      )
      VALUES
      ($1, $2, $3, $4, NOW())
      ON CONFLICT(permission_key)
      DO NOTHING
      `,
      [permissionId, "tts", "tts.manage", "Manage platform TTS configuration"],
    );

    await queryRunner.query(`
      INSERT INTO user_permissions
      (
        user_id,
        permission_id,
        created_at
      )
      SELECT
        u.id,
        p.id,
        NOW()
      FROM users u
      CROSS JOIN permissions p
      WHERE u.platform_role = 'ADMIN'
        AND p.permission_key = 'tts.manage'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_id IN (
        SELECT id
        FROM permissions
        WHERE permission_key = 'tts.manage'
      );
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE permission_key = 'tts.manage';
    `);
  }
}
