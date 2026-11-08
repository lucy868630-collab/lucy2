"""类型化错误与全局异常处理，避免把堆栈返回给调用方。"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


def problem(request: Request, status: int, code: str, detail: str, errors=None) -> JSONResponse:
    body = {
        "title": code,
        "code": code,
        "status": status,
        "detail": detail,
        "request_id": getattr(request.state, "request_id", "unknown"),
    }
    if errors is not None:
        body["errors"] = errors
    return JSONResponse(status_code=status, content=body)


def register_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return problem(
            request, 422, "VALIDATION_ERROR", "请求参数不合法",
            [
                {"field": ".".join(str(x) for x in err["loc"]), "message": err["msg"]}
                for err in exc.errors()
            ],
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return problem(request, exc.status, exc.code, exc.message)

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        return problem(request, 500, "INTERNAL_ERROR", "服务内部错误，请稍后重试")
