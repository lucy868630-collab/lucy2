// 类型化错误层级：所有可预期错误都带稳定的 code / status，不把堆栈返回给客户端。
export class AppError extends Error {
  constructor(message, { code = "INTERNAL_ERROR", status = 500, details = null, operational = true } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.operational = operational;
  }
}

export class ValidationError extends AppError {
  constructor(message = "请求参数不合法", details = null) {
    super(message, { code: "VALIDATION_ERROR", status: 422, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "未授权：请先登录并携带有效 Bearer token") {
    super(message, { code: "UNAUTHORIZED", status: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "没有权限执行此操作") {
    super(message, { code: "FORBIDDEN", status: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} 不存在：${id}`, { code: "NOT_FOUND", status: 404 });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "请求过于频繁，请一分钟后再试") {
    super(message, { code: "RATE_LIMITED", status: 429 });
  }
}

export class UpstreamError extends AppError {
  constructor(message = "上游服务不可用", details = null) {
    super(message, { code: "UPSTREAM_ERROR", status: 502, details });
  }
}

/** 统一的问题响应（RFC 7807 风格），request_id 贯穿日志与响应。 */
export function toProblem(err, requestId) {
  if (err instanceof AppError && err.operational) {
    return {
      status: err.status,
      body: {
        title: err.name,
        code: err.code,
        status: err.status,
        detail: err.message,
        ...(err.details ? { errors: err.details } : {}),
        request_id: requestId,
      },
    };
  }
  return {
    status: 500,
    body: {
      title: "InternalError",
      code: "INTERNAL_ERROR",
      status: 500,
      detail: "服务内部错误，请稍后重试",
      request_id: requestId,
    },
  };
}
