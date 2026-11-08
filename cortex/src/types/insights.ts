// 前后端共享类型：新增模块用 TypeScript，存量 JS 通过 JSDoc / 渐进迁移复用。
export type InsightGroup = "category" | "region" | "channel" | "month";

export interface InsightTotals {
  revenue: number;
  profit: number;
  margin_pct: number;
  orders: number;
  units: number;
}

export interface InsightSeriesItem {
  name: string;
  revenue: number;
  profit: number;
  margin_pct: number;
  orders: number;
  units: number;
}

export interface InsightMeta {
  group: InsightGroup;
  from: string | null;
  to: string | null;
  generated_at: string;
  source: "supabase/orders" | "request";
  cached: boolean;
}

export interface InsightPayload {
  meta: InsightMeta;
  totals: InsightTotals;
  series: InsightSeriesItem[];
  group: InsightGroup;
  row_count: number;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ProblemDetails {
  title: string;
  code: string;
  status: number;
  detail: string;
  errors?: Array<{ field: string; message: string }>;
  request_id: string;
}

export interface StackCheck {
  status: string;
  [key: string]: unknown;
}

export interface ReadyResponse {
  status: string;
  degraded: boolean;
  issues: string[];
  checks: Record<string, StackCheck>;
}
