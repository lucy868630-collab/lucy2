import test from "node:test";
import assert from "node:assert/strict";

import { computeChurn, normalizeRows, sampleChurnRows } from "../lib/churn.js";
import { T } from "../lib/i18n.js";

test("中英文字典键完全一致，流失预警文案不缺项", () => {
  assert.deepEqual(Object.keys(T.zh).sort(), Object.keys(T.en).sort());
  assert.ok(T.zh.churnMethod.includes("不是机器学习预测概率"));
  assert.ok(T.en.churnMethod.toLowerCase().includes("not a machine"));
});

test("normalizeRows 兼容 snake_case 与 CamelCase，丢弃无客户标识或坏日期的行", () => {
  const rows = normalizeRows([
    { order_date: "2026-11-01", customer_id: "A", revenue: "1,200.50" },
    { OrderDate: "2026-10-20", CustomerID: "B", Revenue_NZD: 300 },
    { order_date: "2026-11-01", revenue: 500 },
    { order_date: "not-a-date", customer_id: "C", revenue: 10 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].customer, "A");
  assert.equal(rows[0].revenue, 1200.5);
  assert.equal(rows[1].customer, "B");
  assert.ok(rows[0].date instanceof Date);
});

test("没有客户标识时明确不可用，绝不编造名单", () => {
  const r = computeChurn(normalizeRows([{ order_date: "2026-11-01", revenue: 100 }]));
  assert.equal(r.available, false);
  assert.deepEqual(r.high, []);
  assert.deepEqual(r.trend, []);
});

test("长期未消费且活跃度下降的客户进入高风险档", () => {
  const rows = normalizeRows([
    { order_date: "2026-08-06", customer_id: "SLEEPY", revenue: 200 },
    { order_date: "2026-06-17", customer_id: "SLEEPY", revenue: 180 },
  ]);
  const r = computeChurn(rows, { asOf: "2026-11-14" });
  assert.equal(r.available, true);
  assert.equal(r.counts.high, 1);
  assert.ok(r.high[0].score >= 70);
  assert.ok(r.high[0].reasons.includes("long_absence"));
  assert.ok(r.high[0].reasons.includes("activity_drop"));
});

test("近期持续活跃的客户进入低风险档", () => {
  const rows = normalizeRows([
    { order_date: "2026-11-11", customer_id: "ACTIVE", revenue: 100 },
    { order_date: "2026-10-25", customer_id: "ACTIVE", revenue: 100 },
    { order_date: "2026-10-07", customer_id: "ACTIVE", revenue: 100 },
    { order_date: "2026-09-23", customer_id: "ACTIVE", revenue: 100 },
  ]);
  const r = computeChurn(rows, { asOf: "2026-11-14" });
  assert.equal(r.counts.low, 1);
  assert.ok(r.low[0].score < 40);
});

test("三档数量守恒，分数落在 0–100，趋势含 8 个周快照", () => {
  const r = computeChurn(sampleChurnRows(new Date("2026-11-14T00:00:00Z")));
  assert.equal(r.available, true);
  assert.equal(r.counts.total, r.counts.high + r.counts.medium + r.counts.low);
  assert.equal(r.trend.length, 8);
  for (const c of [...r.high, ...r.medium, ...r.low]) {
    assert.ok(c.score >= 0 && c.score <= 100);
    assert.ok(["high", "medium", "low"].includes(c.band));
  }
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.asOf));
});

test("示例客户全部带 DEMO- 前缀，且三档都有人", () => {
  const rows = sampleChurnRows(new Date("2026-11-14T00:00:00Z"));
  assert.ok(rows.every((x) => String(x.customer).startsWith("DEMO-")));
  const r = computeChurn(rows);
  assert.equal(r.isSample, false);
  assert.ok(r.counts.high > 0 && r.counts.medium > 0 && r.counts.low > 0);
});
