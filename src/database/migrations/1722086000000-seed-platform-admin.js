import bcrypt from "bcryptjs";

export class SeedPlatformAdmin1722086000000 {
  async up(queryRunner) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);

    const userResult = await queryRunner.query(`
      INSERT INTO users
      (
        id,
        name,
        email,
        password_hash,
        platform_role,
        created_at,
        updated_at
      )
      VALUES
      (
        gen_random_uuid(),
        'Platform Admin',
        'admin@ai-platform.com',
        '${passwordHash}',
        'ADMIN',
        now(),
        now()
      )
      RETURNING id;
    `);

    const userId = userResult[0].id;

    await queryRunner.query(`
      INSERT INTO user_permissions
      (
        user_id,
        permission_id,
        created_at
      )
      SELECT
        '${userId}',
        id,
        now()
      FROM permissions;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM users
      WHERE email = 'admin@ai-platform.com';
    `);
  }
}
