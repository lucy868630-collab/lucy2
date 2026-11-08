import { cacheGet, cacheSet } from "../../shared/cache.js";
import { ordersRepository } from "./repository.js";

const DIMENSION = {
  category: "product_category",
  region: "region",
  channel: "channel",
};
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

/** 纯业务函数：把订单行聚合成 KPI + 分组序列，不依赖 HTTP 或数据库。 */
export function aggregate(rows, { group, top }) {
  const buckets = new Map();
  const totals = { revenue: 0, profit: 0, orders: 0, units: 0 };

  for (const row of rows) {
    const revenue = num(row.revenue);
    const profit = num(row.profit);
    const units = num(row.quantity);
    totals.revenue += revenue;
    totals.profit += profit;
    totals.orders += 1;
    totals.units += units;

    const key =
      group === "month"
        ? String(row.order_date || "").slice(0, 7) || "未知月份"
        : String(row[DIMENSION[group]] || "").trim() || "—";
    if (!buckets.has(key)) {
      buckets.set(key, { name: key, revenue: 0, profit: 0, orders: 0, units: 0 });
    }
    const b = buckets.get(key);
    b.revenue += revenue;
    b.profit += profit;
    b.orders += 1;
    b.units += units;
  }

  const series = [...buckets.values()]
    .map((b) => ({
      ...b,
      revenue: round2(b.revenue),
      profit: round2(b.profit),
      margin_pct: b.revenue ? round2((b.profit / b.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, top);

  return {
    totals: {
      revenue: round2(totals.revenue),
      profit: round2(totals.profit),
      margin_pct: totals.revenue ? round2((totals.profit / totals.revenue) * 100) : 0,
      orders: totals.orders,
      units: totals.units,
    },
    series,
    group,
    row_count: rows.length,
  };
}

/** 缓存旁路（cache-aside）：命中直接返回，未命中查库、聚合、写回并带 TTL。 */
export async function getInsights({ userId, token, query, log }) {
  const key = `insights:v1:${userId}:${query.group}:${query.from}:${query.to}:${query.top}`;
  const cached = await cacheGet(key);
  if (cached) {
    log.info("cache.hit", { group: query.group });
    return { ...cached, meta: { ...cached.meta, cached: true } };
  }

  const rows = await ordersRepository(token).list({ ...query, userId });
  const payload = {
    meta: {
      group: query.group,
      from: query.from || null,
      to: query.to || null,
      generated_at: new Date().toISOString(),
      source: "supabase/orders",
      cached: false,
    },
    ...aggregate(rows, query),
  };
  await cacheSet(key, payload);
  log.info("insights.generated", { rows: rows.length, group: query.group });
  return payload;
}
