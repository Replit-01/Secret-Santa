import app from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Secret Santa API started");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down Secret Santa API");
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
