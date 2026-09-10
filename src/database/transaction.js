import { AppDataSource } from "./datasource.js";

export async function executeTransaction(callback) {
  const queryRunner = AppDataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await callback(queryRunner);

    await queryRunner.commitTransaction();

    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
