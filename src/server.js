import "dotenv/config";

import app from "./app.js";
import { appConfig } from "./config/index.js";
import { AppDataSource } from "./database/datasource.js";
import { connectRedis } from "./infrastructure/redis/redis.client.js";

const { port, name, version } = appConfig;

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log("✅ PostgreSQL connected");

    if (process.env.RUN_MIGRATIONS !== "false") {
      await AppDataSource.runMigrations();
      console.log("✅ Migrations synchronized");
    } else {
      console.log(
        "ℹ️ Skipping migrations synchronization (RUN_MIGRATIONS=false)",
      );
    }

    await connectRedis();
    console.log("✅ Redis connected");

    app.listen(port, "0.0.0.0", () => {
      console.log(`${name} v${version} is running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start application");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
