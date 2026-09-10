export class AddUserProfileFields1723000140000 {
  name = "AddUserProfileFields1723000140000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN phone VARCHAR(30)
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN profile_photo_upload_id UUID
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS profile_photo_upload_id
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS phone
    `);
  }
}
