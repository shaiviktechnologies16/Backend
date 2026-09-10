export class AddUserIdDefault1722086400000 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN id
      SET DEFAULT uuid_generate_v4();
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN id
      DROP DEFAULT;
    `);
  }
}
