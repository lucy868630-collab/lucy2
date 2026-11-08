"""Cortex AI 微服务：零外部密钥即可运行（本地向量 + 聚合），可选接入远程模型。"""
import json
import math
import time
import uuid
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_handlers
from .schemas import EmbeddingsRequest, InsightsRequest, OrderRow, VectorSearchRequest

app = FastAPI(title="Cortex AI microservice", version=settings.version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
register_handlers(app)


def log(level: str, msg: str, **fields) -> None:
    print(json.dumps({
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level": level,
        "msg": msg,
        "service": settings.service,
        **fields,
    }, ensure_ascii=False), flush=True)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    log("info", "request.completed", request_id=request.state.request_id,
        method=request.method, path=request.url.path, status=response.status_code,
        duration_ms=round((time.perf_counter() - started) * 1000, 2))
    return response


def local_embedding(text: str, dim: int | None = None) -> list[float]:
    """字符 3-gram 哈希向量，与 cortex/src/shared/ai/embeddings.js 完全一致。"""
    dim = dim or settings.vector_dim
    vector = [0.0] * dim
    value = (text or "").lower()
    for i in range(len(value)):
        gram = value[i:i + 3]
        h = 2166136261
        for ch in gram:
            h ^= ord(ch)
            h = (h * 16777619) & 0xFFFFFFFF
        if h >= 2 ** 31:  # JS 的 Math.imul 结果是 32 位有符号整数
            h -= 2 ** 32
        vector[abs(h) % dim] += 1.0
    norm = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [x / norm for x in vector]


def cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def aggregate(rows: list[OrderRow], group: str, top: int) -> dict:
    field = {"category": "product_category", "region": "region", "channel": "channel"}.get(group)
    buckets: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "profit": 0.0, "orders": 0, "units": 0})
    totals = {"revenue": 0.0, "profit": 0.0, "orders": 0, "units": 0}

    for row in rows:
        revenue, profit, units = row.revenue, row.profit, row.quantity
        totals["revenue"] += revenue
        totals["profit"] += profit
        totals["orders"] += 1
        totals["units"] += units
        key = (row.order_date or "")[:7] or "未知月份" if group == "month" else (getattr(row, field) or "—")
        bucket = buckets[key]
        bucket["revenue"] += revenue
        bucket["profit"] += profit
        bucket["orders"] += 1
        bucket["units"] += units

    series = sorted(
        (
            {
                "name": name,
                "revenue": round(b["revenue"], 2),
                "profit": round(b["profit"], 2),
                "margin_pct": round(b["profit"] / b["revenue"] * 100, 2) if b["revenue"] else 0.0,
                "orders": b["orders"],
                "units": b["units"],
            }
            for name, b in buckets.items()
        ),
        key=lambda item: item["revenue"],
        reverse=True,
    )[:top]

    return {
        "totals": {
            "revenue": round(totals["revenue"], 2),
            "profit": round(totals["profit"], 2),
            "margin_pct": round(totals["profit"] / totals["revenue"] * 100, 2) if totals["revenue"] else 0.0,
            "orders": totals["orders"],
            "units": totals["units"],
        },
        "series": series,
        "group": group,
        "row_count": len(rows),
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.service, "version": settings.version}


@app.get("/ready")
def ready() -> dict:
    return {
        "status": "ok",
        "checks": {
            "service": "ok",
            "embeddings": "local-hash (zero-config)",
            "vector_dim": settings.vector_dim,
            "allowed_origins": settings.allowed_origins,
        },
    }


@app.post("/v1/embeddings")
def embeddings(payload: EmbeddingsRequest) -> dict:
    return {
        "data": {
            "vectors": [local_embedding(text) for text in payload.texts],
            "dimensions": settings.vector_dim,
            "backend": "local-hash",
        }
    }


@app.post("/v1/insights")
def insights(payload: InsightsRequest) -> dict:
    return {"data": aggregate(payload.rows, payload.group, payload.top)}


@app.post("/v1/vector/search")
def vector_search(payload: VectorSearchRequest) -> dict:
    query = local_embedding(payload.query)
    scored = [
        {"index": i, "text": text, "score": round(cosine(query, local_embedding(text)), 4)}
        for i, text in enumerate(payload.documents)
    ]
    scored.sort(key=lambda item: item["score"], reverse=True)
    return {"data": scored[:payload.top_k], "meta": {"backend": "local-hash", "count": len(payload.documents)}}
