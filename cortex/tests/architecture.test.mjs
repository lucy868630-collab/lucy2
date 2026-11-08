import test from "node:test";
import assert from "node:assert/strict";

import { aggregate } from "../src/features/insights/service.js";
import { GROUPS, parseListQuery, parseRowsBody } from "../src/features/insights/schema.js";
import { localEmbedding, VECTOR_DIM } from "../src/shared/ai/embeddings.js";
import { cosineSimilarity, createVectorStore } from "../src/shared/ai/vector.js";
import { mongoStatus } from "../src/shared/db/mongo.js";
import { toProblem, ValidationError } from "../src/shared/errors.js";
import { T } from "../lib/i18n.js";
import { normDate } from "../lib/date.js";

test("aggregate 按品类汇总并计算利润率", () => {
  const rows = [
    { product_category: "Electronics", region: "Auckland", channel: "Online", order_date: "2026-01-05", revenue: 1000, profit: 250, quantity: 2 },
    { product_category: "Home", region: "Wellington", channel: "Retail", order_date: "2026-01-08", revenue: 500, profit: 150, quantity: 1 },
    { product_category: "Electronics", region: "Auckland", channel: "Online", order_date: "2026-02-01", revenue: 500, profit: 50, quantity: 3 },
  ];
  const r = aggregate(rows, { group: "category", top: 10 });
  assert.equal(r.row_count, 3);
  assert.equal(r.totals.revenue, 2000);
  assert.equal(r.totals.profit, 450);
  assert.equal(r.totals.margin_pct, 22.5);
  assert.equal(r.totals.units, 6);
  assert.deepEqual(r.series.map((x) => x.name), ["Electronics", "Home"]);
  assert.equal(r.series[0].orders, 2);
});

test("aggregate 按月份分组", () => {
  const rows = [
    { order_date: "2026-01-05", revenue: 10, profit: 1, quantity: 1 },
    { order_date: "2026-02-09", revenue: 20, profit: 2, quantity: 1 },
  ];
  const r = aggregate(rows, { group: "month", top: 10 });
  assert.deepEqual(r.series.map((x) => x.name).sort(), ["2026-01", "2026-02"]);
});

test("parseListQuery 拒绝非法 group 与日期区间", () => {
  assert.deepEqual(GROUPS, ["category", "region", "channel", "month"]);
  assert.throws(() => parseListQuery(new URLSearchParams("group=nope")), ValidationError);
  assert.throws(() => parseListQuery(new URLSearchParams("from=2026-01&to=2026-01-01")), ValidationError);
  assert.throws(() => parseListQuery(new URLSearchParams("from=2026-05-01&to=2026-01-01")), ValidationError);
  const ok = parseListQuery(new URLSearchParams("group=region&from=2026-01-01&to=2026-03-01&top=999"));
  assert.equal(ok.group, "region");
  assert.equal(ok.top, 100);
});

test("parseRowsBody 只保留白名单字段并兼容常见别名", () => {
  const { rows, group } = parseRowsBody({
    group: "channel",
    rows: [{ Date: "2026-01-01", Category: "Electronics", Revenue_NZD: "120", Profit_NZD: "30", evil: "<script>" }],
  });
  assert.equal(group, "channel");
  assert.equal(rows[0].order_date, "2026-01-01");
  assert.equal(rows[0].product_category, "Electronics");
  assert.equal(rows[0].revenue, 120);
  assert.equal(rows[0].profit, 30);
  assert.equal(rows[0].evil, undefined);
  assert.throws(() => parseRowsBody({ rows: [] }), ValidationError);
  assert.throws(() => parseRowsBody({ rows: "nope" }), ValidationError);
});

test("normDate 拦截会触发 Postgres 时区错误的异常值", () => {
  assert.equal(normDate("11113212"), "");
  assert.equal(normDate("2026-02-30"), "");
  assert.equal(normDate("45000"), "");
  assert.equal(normDate("2026/1/5"), "2026-01-05");
  assert.equal(normDate("2026-01-01T10:00:00.000Z"), "2026-01-01");
});

test("本地向量维度固定、归一化且相似度可计算", () => {
  const a = localEmbedding("electronics auckland online store");
  assert.equal(a.length, VECTOR_DIM);
  const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9);
  assert.ok(Math.abs(cosineSimilarity(a, a) - 1) < 1e-9);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1], [1, 2]), 0);
});

test("向量库 add/search 返回按相似度排序的结果", async () => {
  const store = createVectorStore();
  const added = await store.add([
    { id: "a", text: "电子产品 奥克兰 线上商店 收入", metadata: { tag: "sales" } },
    { id: "b", text: "家用电器 惠灵顿 实体门店 利润", metadata: { tag: "sales" } },
  ]);
  assert.equal(added.added, 2);
  assert.equal(added.total, 2);
  const hits = await store.search("电子产品 奥克兰 线上商店", 2);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].score > hits[1].score);
  assert.equal(store.stats().count, 2);
  await assert.rejects(() => store.search(""), ValidationError);
});

test("类型化错误统一映射为问题响应", () => {
  const err = new ValidationError("参数错误", [{ field: "x", message: "required" }]);
  const p = toProblem(err, "req-123");
  assert.equal(p.status, 422);
  assert.equal(p.body.code, "VALIDATION_ERROR");
  assert.equal(p.body.request_id, "req-123");
  assert.equal(p.body.errors[0].field, "x");
  const raw = toProblem(new Error("boom"), "req-456");
  assert.equal(raw.status, 500);
  assert.equal(raw.body.detail.includes("boom"), false);
});

test("MongoDB 未配置时安全降级", async () => {
  const prev = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const status = await mongoStatus();
  assert.equal(status.status, "unconfigured");
  if (prev !== undefined) process.env.MONGODB_URI = prev;
});

test("中英文字典键完全一致，翻译文案不缺项", () => {
  assert.deepEqual(Object.keys(T.zh).sort(), Object.keys(T.en).sort());
  for (const k of ["translateBtn", "translating", "reportLangHint", "errTranslate"]) {
    assert.ok(T.zh[k] && T.en[k], `missing ${k}`);
  }
  assert.ok(T.zh.translateBtn.includes("{LANG}"));
  assert.ok(T.en.translateBtn.includes("{LANG}"));
});
