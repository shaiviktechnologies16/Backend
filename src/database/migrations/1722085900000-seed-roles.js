export class SeedRoles1722085900000 {
  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO roles
      (
        id,
        name,
        description,
        is_system,
        created_at,
        updated_at
      )
      VALUES
      (
        gen_random_uuid(),
        'PLATFORM_ADMIN',
        'Full platform access',
        true,
        now(),
        now()
      ),
      (
        gen_random_uuid(),
        'PLATFORM_MANAGER',
        'Platform management access',
        true,
        now(),
        now()
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM roles
      WHERE name IN (
        'PLATFORM_ADMIN',
        'PLATFORM_MANAGER'
      );
    `);
  }
}
