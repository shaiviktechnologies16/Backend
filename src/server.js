import "dotenv/config";

import app from "./app.js";
import { appConfig } from "./config/index.js";
import { AppDataSource, registerPoolDiagnostics } from "./database/datasource.js";
import { connectRedis } from "./infrastructure/redis/redis.client.js";
import { dailyClosureScheduler } from "./container/services.js";

const { port, name, version } = appConfig;

let isShuttingDown = false;

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    registerPoolDiagnostics(AppDataSource);
    console.log("✅ PostgreSQL connected");

    if (process.env.RUN_MIGRATIONS !== "false") {
      await AppDataSource.runMigrations();
      console.log("✅ Migrations synchronized");
    } else {
      console.log(
        "ℹ️ Skipping migrations synchronization (RUN_MIGRATIONS=false)",
      );
    }

    try {
      await connectRedis();
      console.log("✅ Redis connected");
    } catch (redisErr) {
      console.warn("⚠️ Redis startup warning:", redisErr?.message || redisErr);
      console.warn("ℹ️ Server running with local concurrency fallback.");
    }

    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`${name} v${version} is running on port ${port}`);
      try {
        dailyClosureScheduler.start();
      } catch (schedErr) {
        console.warn("⚠️ Failed to start daily closure scheduler:", schedErr?.message || schedErr);
      }
    });

    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("🔒 HTTP server closed.");
        try {
          if (dailyClosureScheduler?.stop) {
            dailyClosureScheduler.stop();
          }
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("🔌 PostgreSQL DataSource destroyed cleanly.");
          }
        } catch (err) {
          console.error("⚠️ Error during database disconnect:", err?.message || err);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error("⚠️ Forcing shutdown after timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start application");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
