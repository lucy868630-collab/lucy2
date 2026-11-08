import { toProblem } from "./errors.js";
import { createLogger, newRequestId } from "./logger.js";

export function json(body, { status = 200, requestId, headers = {} } = {}) {
  const h = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  };
  if (requestId) h["X-Request-Id"] = requestId;
  return new Response(JSON.stringify(body), { status, headers: h });
}

function pathOf(req) {
  try {
    return new URL(req.url).pathname;
  } catch {
    return req.url;
  }
}

/**
 * 全局错误处理包装：注入 requestId / logger，记录进出日志，异常统一转成问题响应。
 * controller 只负责解析、校验、调用 service、格式化，不含业务规则。
 */
export function handle(fn) {
  return async (req, ctx = {}) => {
    const requestId = req.headers.get("x-request-id") || newRequestId();
    const log = createLogger(requestId);
    const started = Date.now();
    const meta = { method: req.method, path: pathOf(req) };
    try {
      const res = await fn(req, { ...ctx, requestId, log });
      log.info("request.completed", { ...meta, status: res.status, duration_ms: Date.now() - started });
      return res;
    } catch (err) {
      log.error("request.failed", {
        ...meta,
        error: err?.message,
        code: err?.code,
        stack: err?.stack,
        duration_ms: Date.now() - started,
      });
      const { status, body } = toProblem(err, requestId);
      return json(body, { status, requestId });
    }
  };
}
