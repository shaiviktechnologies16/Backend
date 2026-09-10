export class CreateUsers1722084200000 {
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE users;
    `);
  }
}
