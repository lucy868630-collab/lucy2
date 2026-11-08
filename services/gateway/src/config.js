// 网关唯一的环境变量读取点；启动时校验必要项，缺配置直接失败而不是带病运行。
const pick = (name, fallback) => String(process.env[name] ?? fallback).trim();

function required(name, fallback) {
  const value = pick(name, fallback);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  port: Number.parseInt(pick("PORT", "3001"), 10),
  upstream: required("UPSTREAM_URL", "http://localhost:3000").replace(/\/$/, ""),
  origins: pick("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimit: { windowMs: 60 * 1000, max: 60 },
  bodyLimit: pick("BODY_LIMIT", "128kb"),
  upstreamTimeoutMs: Number.parseInt(pick("UPSTREAM_TIMEOUT_MS", "30000"), 10),
  logLevel: pick("LOG_LEVEL", "info"),
  version: "1.0.0",
};
