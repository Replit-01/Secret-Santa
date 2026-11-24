import app from "./app.js";
import { closeDatabase, initializeDatabase } from "./lib/database.js";
import { logger } from "./lib/logger.js";

await initializeDatabase();

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Secret Santa API started");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down Secret Santa API");
  server.close(async () => {
    try {
      await closeDatabase();
    } catch (error) {
      logger.error({ err: error }, "Failed to close PostgreSQL connection pool");
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
