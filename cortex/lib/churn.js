// 客户流失风险预警：可解释的 RFM + 活跃度规则评分。
// 不是训练出来的概率模型，不编造客户，不依赖额外的数据库表或外部服务。
// 输入只来自当前账户的订单行；没有客户标识时明确返回 available: false。

const DAY = 86400000;
const HIGH = 70;
const MID = 40;

const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function toDate(v) {
  const s = String(v ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const iso = (d) => d.toISOString().slice(0, 10);
const emptyCounts = () => ({ high: 0, medium: 0, low: 0, total: 0 });
const unavailable = (isSample) => ({
  available: false, isSample, trend: [], counts: emptyCounts(),
  high: [], medium: [], low: [], riskRate: 0, avgScore: 0, deltaHigh: 0,
});

/** 兼容 Supabase 的 snake_case 与 CSV 上传后的 CamelCase 列名。 */
export function normalizeRows(raw) {
  const out = [];
  for (const r of raw || []) {
    if (!r || typeof r !== "object") continue;
    const date = toDate(r.order_date ?? r.OrderDate ?? r.date ?? r.Date);
    const customer = String(r.customer_id ?? r.CustomerID ?? r.customer ?? r.Customer ?? "").trim();
    if (!date || !customer) continue;
    out.push({
      date,
      customer: customer.slice(0, 80),
      revenue: num(r.revenue ?? r.Revenue_NZD ?? r.revenue_nzd ?? r.Revenue),
    });
  }
  return out;
}

/** 演示用订单行：确定性生成，客户 ID 带 DEMO- 前缀，绝不冒充真实客户。 */
export function sampleChurnRows(now = new Date()) {
  const rows = [];
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const add = (customer, daysAgo, revenue) =>
    rows.push({ date: new Date(base - daysAgo * DAY), customer, revenue });

  for (let i = 1; i <= 8; i++) {
    const id = "DEMO-" + String(i).padStart(3, "0");
    add(id, 100 + i * 6, 180 + i * 9);
    add(id, 150 + i * 6, 140 + i * 7);
  }
  for (let i = 1; i <= 15; i++) {
    const id = "DEMO-" + String(100 + i).padStart(3, "0");
    add(id, 45 + i * 2, 120 + i * 6);
    add(id, 80 + i * 2, 100 + i * 4);
  }
  for (let i = 1; i <= 40; i++) {
    const id = "DEMO-" + String(200 + i).padStart(3, "0");
    add(id, 2 + (i % 14), 90 + (i % 7) * 12);
    add(id, 20 + (i % 12), 80 + (i % 5) * 14);
    add(id, 38 + (i % 10), 75 + (i % 6) * 11);
    add(id, 52 + (i % 9), 70 + (i % 4) * 13);
  }
  return rows;
}

function snapshot(rows, at) {
  const atMs = at.getTime();
  const recentFrom = atMs - 30 * DAY;
  const prevFrom = atMs - 60 * DAY;
  const map = new Map();

  for (const r of rows) {
    const time = r.date.getTime();
    if (time > atMs) continue;
    let c = map.get(r.customer);
    if (!c) {
      c = { id: r.customer, orders: 0, revenue: 0, last: 0, recent: 0, prev: 0, recentRev: 0, prevRev: 0 };
      map.set(r.customer, c);
    }
    c.orders += 1;
    c.revenue += r.revenue;
    if (time > c.last) c.last = time;
    if (time >= recentFrom) { c.recent += 1; c.recentRev += r.revenue; }
    else if (time >= prevFrom) { c.prev += 1; c.prevRev += r.revenue; }
  }

  const customers = [];
  for (const c of map.values()) {
    const recency = Math.max(0, Math.round((atMs - c.last) / DAY));
    const reasons = [];

    // 1) 沉睡程度 0–45 分
    let score = Math.min(recency / 120, 1) * 45;
    if (recency > 60) reasons.push("long_absence");

    // 2) 最近 30 天 vs 前 30 天的活跃度下降 0–30 分
    if (c.prev > 0) {
      const drop = Math.max(0, (c.prev - c.recent) / c.prev);
      score += drop * 30;
      if (drop >= 0.5) reasons.push("activity_drop");
    } else if (c.recent === 0 && recency > 30) {
      score += 30;
      reasons.push("activity_drop");
    } else {
      score += 6;
    }

    // 3) 累计频次低 0–15 分
    if (c.orders <= 1) { score += 15; reasons.push("low_frequency"); }
    else if (c.orders <= 3) score += 9;
    else if (c.orders <= 6) score += 4;

    // 4) 消费额衰减 0–10 分
    if (c.prevRev > 0 && c.recentRev < c.prevRev * 0.6) { score += 10; reasons.push("spend_decline"); }
    else if (c.prevRev > 0 && c.recentRev < c.prevRev) score += 5;

    if (!reasons.length) reasons.push("stable");
    const finalScore = Math.round(Math.min(100, score));
    customers.push({
      id: c.id,
      score: finalScore,
      band: finalScore >= HIGH ? "high" : finalScore >= MID ? "medium" : "low",
      recency,
      orders: c.orders,
      revenue: Math.round(c.revenue * 100) / 100,
      reasons,
    });
  }
  customers.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  return customers;
}

function summarise(customers) {
  const high = customers.filter((c) => c.band === "high");
  const medium = customers.filter((c) => c.band === "medium");
  const low = customers.filter((c) => c.band === "low");
  const total = customers.length || 1;
  return {
    high, medium, low,
    counts: { high: high.length, medium: medium.length, low: low.length, total: customers.length },
    riskRate: Math.round((high.length / total) * 1000) / 10,
    avgScore: customers.length
      ? Math.round(customers.reduce((s, c) => s + c.score, 0) / customers.length)
      : 0,
  };
}

/** 主入口：输出三档名单、整体风险率与按周回溯的趋势快照。 */
export function computeChurn(rows, { asOf = null, weeks = 8, isSample = false } = {}) {
  const valid = (rows || []).filter(
    (r) => r && r.date instanceof Date && !Number.isNaN(r.date.getTime()) && r.customer
  );
  if (!valid.length) return unavailable(isSample);

  const latest = asOf
    ? new Date(asOf)
    : new Date(valid.reduce((m, r) => Math.max(m, r.date.getTime()), 0));
  if (Number.isNaN(latest.getTime())) return unavailable(isSample);

  const current = summarise(snapshot(valid, latest));
  const trend = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const at = new Date(latest.getTime() - i * 7 * DAY);
    const s = summarise(snapshot(valid, at));
    trend.push({ label: iso(at).slice(5), high: s.counts.high, medium: s.counts.medium, riskRate: s.riskRate });
  }
  const before = trend.length >= 2 ? trend[trend.length - 2] : null;
  return {
    available: true,
    isSample,
    asOf: iso(latest),
    ...current,
    trend,
    deltaHigh: before ? current.counts.high - before.high : 0,
    prevRiskRate: before ? before.riskRate : current.riskRate,
  };
}
