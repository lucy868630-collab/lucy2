import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { AppError, BadRequestError, errorHandler, UpstreamError } from "./errors.js";
import { logger, requestContext, requestLogger } from "./logger.js";

const app = express();
app.disable("x-powered-by");

// 中间件顺序：RequestID → Logging → Security → CORS → RateLimit → BodyParse → Routes → ErrorHandler
app.use(requestContext);
app.use(requestLogger);
app.use(helmet());
app.use(cors({ origin: config.origins, credentials: true }));
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", detail: "请求过于频繁，请稍后再试" },
}));
app.use(express.json({ limit: config.bodyLimit }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "cortex-gateway", version: config.version, timestamp: new Date().toISOString() });
});

app.get("/ready", async (req, res, next) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    let upstream = "unreachable";
    try {
      const r = await fetch(`${config.upstream}/api/health`, { signal: controller.signal });
      upstream = r.ok ? "ok" : `http_${r.status}`;
    } catch {
      // 上游未启动时仍返回 200，由 checks 明确标注，避免网关被误判为宕机
    } finally {
      clearTimeout(timer);
    }
    res.json({ status: "ok", checks: { gateway: "ok", upstream } });
  } catch (err) {
    next(err);
  }
});

const HOP_BY_HOP = new Set([
  "host", "connection", "content-length", "transfer-encoding",
  "content-encoding", "keep-alive", "upgrade",
]);

/** 把 /api/* 透明转发给 Next 应用，保留鉴权头与请求 ID，不透传 hop-by-hop 头。 */
app.all(/^\/api\//, async (req, res, next) => {
  if (req.originalUrl.includes("..")) return next(new BadRequestError("非法路径"));
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k] = v;
  }
  headers["x-request-id"] = req.id;

  const hasBody = !["GET", "HEAD"].includes(req.method) && req.body !== undefined;
  try {
    const upstream = await fetch(`${config.upstream}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(config.upstreamTimeoutMs),
    });
    const text = await upstream.text();
    for (const [k, v] of upstream.headers) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) res.setHeader(k, v);
    }
    res.status(upstream.status).send(text);
  } catch (err) {
    next(new UpstreamError(`转发到 ${config.upstream} 失败：${err.message}`));
  }
});

app.use((req, res) => {
  res.status(404).json({
    title: "NotFoundError", code: "NOT_FOUND", status: 404,
    detail: "未找到该路由", request_id: req.id,
  });
});
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info("gateway.started", {
    port: config.port,
    upstream: config.upstream,
    origins: config.origins.join(","),
  });
});

function shutdown(signal) {
  logger.info("gateway.shutdown", { signal });
  server.close(() => {
    logger.info("gateway.stopped");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, server };
export { AppError };
