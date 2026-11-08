import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[config.logLevel.toLowerCase()] ?? LEVELS.info;

function emit(level, msg, fields = {}) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    service: "cortex-gateway",
    ...fields,
  });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const logger = {
  debug: (msg, f) => emit("debug", msg, f),
  info: (msg, f) => emit("info", msg, f),
  warn: (msg, f) => emit("warn", msg, f),
  error: (msg, f) => emit("error", msg, f),
};

export function requestContext(req, res, next) {
  req.id = req.headers["x-request-id"] || randomUUID().replace(/-/g, "").slice(0, 12);
  req.startedAt = Date.now();
  res.setHeader("X-Request-Id", req.id);
  next();
}

export function requestLogger(req, res, next) {
  res.on("finish", () => {
    logger.info("request.completed", {
      request_id: req.id,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      duration_ms: Date.now() - req.startedAt,
    });
  });
  next();
}
