// 按 AI 数据画像动态构建视图：不再把异构数据硬套进"销售订单"模型
export const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export function buildSmartView(rows, profile) {
  const first = rows[0] || {};
  const exists = (c) => c && Object.prototype.hasOwnProperty.call(first, c);
  const timeCol = exists(profile.time_column) ? profile.time_column : "";
  const dims = (profile.dimension_columns || []).filter((c) => exists(c) && c !== timeCol).slice(0, 3);
  const metrics = (profile.metrics || []).filter((m) => exists(m.column)).slice(0, 4);
  const primary = metrics.find((m) => m.column === profile.primary_metric) || metrics[0];
  const pc = primary?.column;
  const metricLabel = (m, lang) => (lang === "en" ? m.label_en : m.label_zh) || m.column;

  const kpis = metrics.map((m) => {
    const vals = rows.map((r) => num(r[m.column]));
    const sum = vals.reduce((a, b) => a + b, 0);
    const value = m.agg === "avg" ? (vals.length ? sum / vals.length : 0) : sum;
    return { label_zh: m.label_zh, label_en: m.label_en, unit: m.unit || "", value };
  });

  const group = (col, mc, byLabel = false) => {
    const m = {};
    rows.forEach((r) => {
      const k = String(r[col] ?? "—").trim() || "—";
      m[k] = (m[k] || 0) + num(r[mc]);
    });
    const arr = Object.entries(m).map(([k, v]) => [k, +v.toFixed(2)]);
    return byLabel ? arr.sort((a, b) => String(a[0]).localeCompare(String(b[0]))) : arr.sort((a, b) => b[1] - a[1]);
  };

  const trend = timeCol && pc ? group(timeCol, pc, true) : [];
  const byDim = dims.map((d) => (pc ? group(d, pc) : []));
  const category = byDim[0] || [];
  const region = byDim[1] || [];
  const channel = byDim[2] || [];
  const secondMetric = metrics.find((m) => m.column !== pc);
  // 每张图都换成对这份数据真正有意义的视角，不制造假数据
  const marginSeries = secondMetric && dims[0]
    ? { labels: group(dims[0], secondMetric.column).map((x) => x[0]), values: group(dims[0], secondMetric.column).map((x) => x[1]) }
    : { labels: category.map((x) => x[0]), values: category.map((x) => x[1]) };
  const channelSrc = channel.length ? channel : (region.length ? region : category);
  const channelSeries = { labels: channelSrc.map((x) => x[0]), values: channelSrc.map((x) => x[1]) };

  const agg = {
    monthly: trend.map(([k, v]) => [k, v, 0, 1, 0]),
    category: category.map(([k, v]) => [k, v, 0]),
    region: (region.length ? region : category).map(([k, v]) => [k, v, 0]),
    channel: channel.map(([k, v]) => [k, v, 0]),
    top: category.slice(0, 5).map(([k, v]) => [k, v, 0]),
    meta: { rows: rows.length, customers: rows.length },
  };

  const labels = {
    trend: timeCol ? `${timeCol} · ${primary ? metricLabel(primary, "zh") : ""}` : "",
    trendEn: timeCol ? `${timeCol} · ${primary ? metricLabel(primary, "en") : ""}` : "",
    cat: dims[0] ? `按 ${dims[0]} 对比` : "",
    catEn: dims[0] ? `By ${dims[0]}` : "",
    region: dims[1] ? `按 ${dims[1]} 对比` : "",
    regionEn: dims[1] ? `By ${dims[1]}` : "",
    channel: dims[2] ? `按 ${dims[2]} 对比` : "",
    channelEn: dims[2] ? `By ${dims[2]}` : "",
    top: "主要维度 Top 5", topEn: "Top 5 by primary metric",
    margin: secondMetric ? `${metricLabel(secondMetric, "zh")} 对比` : "",
    marginEn: secondMetric ? `${metricLabel(secondMetric, "en")} comparison` : "",
  };

  return { agg, kpis, labels, profile, timeCol, dims, metrics, primary: pc,
    secondMetric: secondMetric?.column, marginSeries, channelSeries };
}
