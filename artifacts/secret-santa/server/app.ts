import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import pinoHttp from "pino-http";
import { GetHealthResponse } from "@workspace/api-zod";
import { logger } from "./lib/logger.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import roomRoutes from "./routes/rooms.js";

const app = express();
app.disable("x-powered-by");
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(express.json({ limit: "12kb" }));

app.get("/api/healthz", (_req, res) => {
  res.json(GetHealthResponse.parse({ status: "ok" }));
});
app.use("/api", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", adminRoutes);
app.use("/api", roomRoutes);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Nie znaleziono endpointu." });
});

const publicDir = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicDir));
app.get("/{*path}", (req, res, next) => {
  if (!req.accepts("html")) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error({ err: error }, "API request failed");
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500;
  res.status(status).json({
    error: status < 500 ? "Nieprawidłowe żądanie." : "Wystąpił błąd serwera.",
  });
};
app.use(errorHandler);

export default app;
