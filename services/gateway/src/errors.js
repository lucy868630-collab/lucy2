import { logger } from "./logger.js";

export class AppError extends Error {
  constructor(message, { code = "INTERNAL_ERROR", status = 500, operational = true } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.operational = operational;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "请求不合法") {
    super(message, { code: "BAD_REQUEST", status: 400 });
  }
}

export class UpstreamError extends AppError {
  constructor(message = "上游服务不可用") {
    super(message, { code: "UPSTREAM_ERROR", status: 502 });
  }
}

// Express 需要 4 个参数才会识别为错误处理中间件。
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const requestId = req.id || "unknown";
  if (err instanceof AppError && err.operational) {
    logger.warn("request.rejected", { request_id: requestId, code: err.code, error: err.message });
    return res.status(err.status).json({
      title: err.name, code: err.code, status: err.status,
      detail: err.message, request_id: requestId,
    });
  }
  logger.error("unhandled.error", { request_id: requestId, error: err.message, stack: err.stack });
  return res.status(500).json({
    title: "InternalError", code: "INTERNAL_ERROR", status: 500,
    detail: "网关内部错误", request_id: requestId,
  });
}
