"""边界输入校验：外部数据一律先过 Pydantic，不信任任何客户端字段。"""
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class EmbeddingsRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=200)

    @field_validator("texts")
    @classmethod
    def non_empty(cls, values: list[str]) -> list[str]:
        if any(not item.strip() for item in values):
            raise ValueError("texts must not contain empty strings")
        if any(len(item) > 4000 for item in values):
            raise ValueError("each text must be at most 4000 characters")
        return values


class OrderRow(BaseModel):
    # extra="ignore" 让任意多余字段在边界处被丢弃
    model_config = {"extra": "ignore"}

    order_date: str = ""
    product_category: str = "—"
    product_name: str = "—"
    region: str = "—"
    channel: str = "—"
    quantity: float = 0
    revenue: float = 0
    profit: float = 0


class InsightsRequest(BaseModel):
    rows: list[OrderRow] = Field(..., min_length=1, max_length=5000)
    group: Literal["category", "region", "channel", "month"] = "category"
    top: int = Field(default=20, ge=1, le=100)


class VectorSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    documents: list[str] = Field(..., min_length=1, max_length=200)
    top_k: int = Field(default=5, ge=1, le=50)
