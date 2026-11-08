import { randomUUID } from "node:crypto";
import { config } from "./config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /(key|token|secret|password|authorization|cookie|credential)/i;
const threshold = LEVELS[config.observability.logLevel.toLowerCase()] ?? LEVELS.info;

export function newRequestId() {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function scrub(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (SENSITIVE.test(k)) continue;
    if (v instanceof Error) {
      out[k] = { message: v.message, name: v.name };
    } else if (v !== undefined && typeof v !== "function") {
      out[k] = v;
    }
  }
  return out;
}

/** 单行结构化 JSON 日志，自动剔除密钥类字段。 */
export function createLogger(requestId, context = {}) {
  const emit = (level, msg, fields = {}) => {
    if (LEVELS[level] < threshold) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      request_id: requestId,
      service: config.app.name,
      ...scrub(context),
      ...scrub(fields),
    });
    const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
    stream.write(line + "\n");
  };
  return {
    debug: (msg, f) => emit("debug", msg, f),
    info: (msg, f) => emit("info", msg, f),
    warn: (msg, f) => emit("warn", msg, f),
    error: (msg, f) => emit("error", msg, f),
    child: (extra) => createLogger(requestId, { ...context, ...extra }),
  };
}
