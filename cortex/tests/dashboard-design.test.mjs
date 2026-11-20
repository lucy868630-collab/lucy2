import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHART_RULES, DESIGN_DICT, DESIGN_ERRORS, DESIGN_PROCESS, GOVERNANCE,
  KPI_QUESTIONS, PAPER_GENRES, PAPER_LENS, SOURCES,
  buildDesignBrief, buildKpiTiles, buildRequirement, drilldownRows,
  ragStatus, requirementDefaults, scoreAudit, sparklinePoints,
} from "../lib/dashboardDesign.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const panel = readFileSync(join(root, "app/dashboard/DashboardDesignPanel.jsx"), "utf8");
const page = readFileSync(join(root, "app/dashboard/page.js"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

test("设计评审字典中英键完全一致，且关键文案齐全", () => {
  const zh = Object.keys(DESIGN_DICT.zh).sort();
  const en = Object.keys(DESIGN_DICT.en).sort();
  assert.deepEqual(zh, en);
  assert.ok(zh.length >= 70, "字典键数量异常");
  for (const key of ["panelTitle", "tabRequirement", "tabKpi", "tabChart", "tabDrill", "tabAudit", "thresholdNote", "refreshTitle", "export"]) {
    assert.ok(DESIGN_DICT.zh[key] && DESIGN_DICT.en[key], `缺少 ${key}`);
  }
});

test("课件来源覆盖 slides p.19–34、notes §4–19 与论文 p.1–2", () => {
  assert.ok(SOURCES.some((s) => s.label.zh.includes("p.19")));
  assert.ok(SOURCES.some((s) => s.label.zh.includes("§4")));
  assert.ok(SOURCES.some((s) => s.label.zh.includes("p.1")));
  const allSources = [...DESIGN_ERRORS, ...GOVERNANCE, ...PAPER_LENS, ...PAPER_GENRES, ...CHART_RULES].map((x) => x.source).join(" | ");
  assert.ok(allSources.includes("p.24") || panel.includes("课件 p.24"), "需求陈述来源缺失");
  assert.ok(allSources.includes("p.26"), "图表选择来源缺失");
  assert.ok(allSources.includes("p.27") || panel.includes("课件 p.27"), "KPI 卡来源缺失");
  assert.ok(allSources.includes("p.31") || panel.includes("课件 p.31"), "两级仪表板来源缺失");
  assert.ok(allSources.includes("p.33"), "常见错误来源缺失");
  assert.ok(allSources.includes("§18"), "治理来源缺失");
});

test("需求陈述包含课件 p.24 的七个要素", () => {
  const zh = buildRequirement(requirementDefaults("zh"), "zh");
  const en = buildRequirement(requirementDefaults("en"), "en");
  for (const part of ["门店经理", "每天", "哪些区域", "营收、毛利率", "当天跟进", "按区域和品类", "仅本店经理"]) {
    assert.ok(zh.includes(part), `中文需求缺少 ${part}`);
  }
  for (const part of ["Store managers", "daily", "which regions", "revenue", "same day", "region and product", "only managers"]) {
    assert.ok(en.includes(part), `英文需求缺少 ${part}`);
  }
});

test("RAG 按目标与极性判定，且未设目标时不编造状态", () => {
  assert.equal(ragStatus(105, 100, "higher").key, "good");
  assert.equal(ragStatus(95, 100, "higher").key, "warn");
  assert.equal(ragStatus(75, 100, "higher").key, "bad");
  assert.equal(ragStatus(4, 5, "lower").key, "good");
  assert.equal(ragStatus(5.4, 5, "lower").key, "warn");
  assert.equal(ragStatus(6.2, 5, "lower").key, "bad");
  assert.equal(ragStatus(100, null).key, "none");
  assert.equal(ragStatus(100, 0).key, "none");
  assert.equal(ragStatus(100, 100, "higher").icon, "✓");
});

test("KPI 四问与卡片字段对应，趋势由当前数据计算", () => {
  assert.deepEqual(KPI_QUESTIONS.map((q) => q.id), ["value", "target", "status", "trend"]);
  const agg = {
    monthly: [
      ["2026-01", 1000, 400, 10, 20],
      ["2026-02", 1500, 600, 15, 30],
      ["2026-03", 2000, 900, 20, 40],
    ],
    meta: { rows: 3, customers: 7 },
    category: [], region: [], channel: [],
  };
  const tiles = buildKpiTiles(agg, { revenue: 1800 }, "all", "zh");
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles.map((t) => t.id), ["revenue", "margin", "orders", "customers"]);
  assert.equal(tiles[0].value, 4500);
  assert.equal(tiles[0].target, 1800);
  assert.equal(tiles[0].status.key, "good");
  assert.ok(tiles[0].series.length === 3);
  assert.equal(tiles[2].value, 45);
  assert.equal(tiles[3].value, 7);
  assert.equal(tiles[3].series.length, 0);
  assert.ok(tiles[1].value > 0 && tiles[1].value < 100);
  assert.ok(sparklinePoints([1, 3, 2]).includes(","));
  assert.equal(sparklinePoints([1]), "");
});

test("按分析问题给出图表建议，标注避免项与工作台落点", () => {
  assert.equal(CHART_RULES.length, 8);
  const target = CHART_RULES.find((r) => r.id === "target");
  assert.equal(target.use.zh, "子弹图");
  assert.equal(target.avoid.zh, "仪表盘 / 速度表");
  assert.equal(target.chartId, null);
  const trend = CHART_RULES.find((r) => r.id === "trend");
  assert.equal(trend.chartId, "chMonthly");
  const share = CHART_RULES.find((r) => r.id === "share");
  assert.equal(share.chartId, "chChannel");
  assert.ok(CHART_RULES.every((r) => r.q.zh && r.use.en && r.source));
});

test("两级钻取从 Level 1 结果 KPI 展开到 Level 2 维度，并保持占比可核对", () => {
  const agg = {
    category: [["A", 60, 30, 6, 10], ["B", 30, 15, 3, 5], ["C", 10, 5, 1, 2]],
    region: [], channel: [], monthly: [], meta: {},
  };
  const rows = drilldownRows(agg, "revenue", "category", "zh");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].name, "A");
  assert.ok(Math.abs(rows.reduce((s, r) => s + r.share, 0) - 100) < 0.001);
  assert.equal(drilldownRows(agg, "orders", "category")[0].value, 6);
  assert.equal(drilldownRows(agg, "revenue", "region").length, 0);
});

test("自检 10 项覆盖 p.33 常见错误并可导出设计说明", () => {
  assert.equal(DESIGN_ERRORS.length, 10);
  assert.equal(DESIGN_PROCESS.length, 10);
  const score = scoreAudit({ noDecision: true, noTarget: true });
  assert.equal(score.passed, 2);
  assert.equal(score.total, 10);
  const brief = buildDesignBrief({
    fields: requirementDefaults("zh"), chartId: "target",
    tiles: buildKpiTiles({ monthly: [], meta: {} }, {}, "all", "zh"),
    checks: { noDecision: true }, action: "区域经理当天跟进",
  }, "zh");
  assert.ok(brief.includes("子弹图"));
  assert.ok(brief.includes("区域经理当天跟进"));
  assert.ok(brief.includes("已通过: 1/10"));
  assert.ok(brief.includes("Sarikaya"));
  assert.ok(brief.includes("p.19"));
});

test("面板已接入工作台导航、KPI 区之后，并传入数据来源与刷新时间", () => {
  assert.ok(panel.includes('id="sec-design"'));
  assert.ok(panel.includes("DashboardDesignPanel"));
  assert.ok(page.includes('nav("sec-design")') && page.includes("t.designNav"));
  assert.ok(page.includes("<DashboardDesignPanel"));
  assert.ok(page.includes("refreshedAt={refreshedAt}") && page.includes("sourceLabel={"));
  assert.ok(page.indexOf("<DashboardDesignPanel") < page.indexOf("<ChurnPanel"));
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon/.test(panel), "设计评审不得上传数据");
});

test("工作台仪表按 iOS HIG 提供触控目标、无障碍标签、进度指示与减弱动态效果", () => {
  const css = readFileSync(join(root, "app/globals.css"), "utf8");
  assert.ok(css.includes("min-height:44px"), "缺少 44pt 最小触控目标");
  assert.ok(css.includes("prefers-reduced-motion"), "未尊重 Reduce Motion 偏好");
  assert.ok(css.includes(":focus-visible"), "缺少可见焦点环");
  assert.ok(css.includes(".kpi-meter"), "缺少 KPI 进度指示样式");
  assert.ok(page.includes('role="progressbar"') && page.includes('aria-valuenow='), "KPI 缺少进度条语义");
  assert.ok(page.includes('role="link"') && page.includes("tabIndex={0}"), "导航缺少键盘可达性");
  assert.ok(page.includes('aria-label={t.navOverview}'), "导航缺少无障碍标签");
});

test("README 记录课件来源、演示阈值边界与导出说明，不依赖本机课件文件", () => {
  assert.ok(readme.includes("MBIC 807 Week 12"));
  assert.ok(readme.includes("slides.pptx") && readme.includes("lecture-notes.docx") && readme.includes("dashboards-paper.pdf"));
  assert.ok(readme.includes("演示阈值不代表已批准 KPI 矩阵"));
  assert.ok(readme.includes("导出 Markdown 设计说明"));
  assert.ok(readme.includes("courses/MBIC 807/"));
});
