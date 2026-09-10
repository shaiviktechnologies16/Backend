import "dotenv/config";
import { AppDataSource } from "./datasource.js";

async function run() {
  await AppDataSource.initialize();

  await AppDataSource.runMigrations();

  console.log("✅ Migrations completed");

  process.exit(0);
}

run();
