// Dashboard Design Review — Week 12 课件驱动的设计评审逻辑
// 来源：MBIC 807 / Week 12 / slides.pptx、lecture-notes.docx、dashboards-paper.pdf
// 所有规则均为课件原则的可执行表达；阈值与目标是演示值，真实项目必须来自语义模型。

export const SOURCES = [
  { id: "slide19", label: { zh: "课件 p.19–34", en: "Slides p.19–34" }, note: { zh: "Week 12 Dashboard Design 主题与课堂活动", en: "Week 12 dashboard design topics and activities" } },
  { id: "notes24", label: { zh: "讲义 §4–19", en: "Lecture notes §4–19" }, note: { zh: "定义、需求、图表、布局、治理与作业链接", en: "Definition, requirements, charts, layout, governance and assessment links" } },
  { id: "paper", label: { zh: "论文 p.1–2 / §3", en: "Paper p.1–2 / §3" }, note: { zh: "Sarikaya et al. (2019) 的设计空间与两类取向", en: "Sarikaya et al. (2019): design space and two genres" } },
];

export const DASHBOARD_TYPES = [
  { id: "strategic", audience: { zh: "高管与董事会", en: "Executives and boards" }, horizon: { zh: "季度到年度", en: "Quarterly to annual" }, content: { zh: "评分卡 KPI、目标、长期趋势", en: "Scorecard KPIs, targets, long trends" }, source: "讲义 §5" },
  { id: "tactical", audience: { zh: "中层经理", en: "Middle managers" }, horizon: { zh: "每周到每月", en: "Weekly to monthly" }, content: { zh: "部门 KPI、对比、差异", en: "Department KPIs, comparisons, variance" }, source: "讲义 §5" },
  { id: "operational", audience: { zh: "主管与一线员工", en: "Supervisors and staff" }, horizon: { zh: "实时到每天", en: "Real time to daily" }, content: { zh: "流程 KPI、告警、队列", en: "Process KPIs, alerts, queues" }, source: "讲义 §5" },
  { id: "analytical", audience: { zh: "分析师", en: "Analysts" }, horizon: { zh: "按需变化", en: "Varies" }, content: { zh: "探索、筛选、明细", en: "Exploration, filters, detail" }, source: "讲义 §5" },
];

export const KPI_QUESTIONS = [
  { id: "value", zh: "当前值是什么？", en: "What is the current value?" },
  { id: "target", zh: "目标是什么？", en: "What is the target?" },
  { id: "status", zh: "状态如何？", en: "What is the status?" },
  { id: "trend", zh: "趋势如何？", en: "What is the trend?" },
];

export const CHART_RULES = [
  { id: "target", q: { zh: "数值是否达到目标？", en: "How does a value compare with a target?" }, use: { zh: "子弹图", en: "Bullet graph" }, avoid: { zh: "仪表盘 / 速度表", en: "Gauge or speedometer" }, chartId: null, note: { zh: "当前工作台用 KPI 卡 + 目标线演示；生产应换成子弹图。", en: "The current workbench uses a KPI tile with target line; production should use a bullet graph." }, source: "课件 p.26 / 讲义 §8" },
  { id: "trend", q: { zh: "数值随时间怎么变？", en: "How does a value change over time?" }, use: { zh: "折线图 / 迷你趋势线", en: "Line chart or sparkline" }, avoid: { zh: "3D 图", en: "3D chart" }, chartId: "chMonthly", note: { zh: "工作台「月度营收」折线图即此实现。", en: "The monthly revenue line chart is this implementation." }, source: "课件 p.26 / 讲义 §8" },
  { id: "category", q: { zh: "类别之间如何比较？", en: "How do categories compare?" }, use: { zh: "排序横向条形图", en: "Sorted horizontal bar chart" }, avoid: { zh: "多片饼图", en: "Pie chart with many slices" }, chartId: "chRegion", note: { zh: "工作台「区域营收」用横向条形；品类环形图只适合占比。", en: "The region chart uses horizontal bars; the category doughnut is only for share." }, source: "课件 p.26 / 讲义 §8" },
  { id: "share", q: { zh: "各部分占多少？", en: "What share does each part hold?" }, use: { zh: "堆叠条形 / 最多三片饼图", en: "Stacked bar, or a pie with up to three slices" }, avoid: { zh: "多片环形图", en: "Doughnut with many slices" }, chartId: "chChannel", note: { zh: "工作台「渠道构成」只有两片，符合上限。", en: "The channel doughnut has two slices, within the limit." }, source: "课件 p.26 / 讲义 §8" },
  { id: "relation", q: { zh: "两个指标有什么关系？", en: "How do two measures relate?" }, use: { zh: "散点图", en: "Scatter plot" }, avoid: { zh: "无清晰标签的双轴图", en: "Dual-axis chart without clear labels" }, chartId: null, note: { zh: "当前 BI 仪表板未内置散点图；机器学习工作流页有散点示例。", en: "No scatter chart in this BI dashboard; the ML studio has a scatter example." }, source: "课件 p.26" },
  { id: "distribution", q: { zh: "数值如何分布？", en: "How is a value distributed?" }, use: { zh: "直方图 / 箱线图", en: "Histogram or box plot" }, avoid: { zh: "只看平均值", en: "Average alone" }, chartId: null, note: { zh: "当前工作台未内置直方图；不要只用一个平均值代替分布。", en: "No histogram built in; do not replace a distribution with a single average." }, source: "课件 p.26" },
  { id: "location", q: { zh: "哪里表现高或低？", en: "Where is performance high or low?" }, use: { zh: "地图（仅当位置有意义）", en: "Map, only when location matters" }, avoid: { zh: "非空间数据用地图", en: "Map for non-spatial data" }, chartId: null, note: { zh: "当前用区域条形图，不把非空间指标强行上图。", en: "Region bars are used; non-spatial metrics are not forced onto a map." }, source: "课件 p.26" },
  { id: "exact", q: { zh: "精确值是多少？", en: "What is the exact value?" }, use: { zh: "表格", en: "Table" }, avoid: { zh: "为一个数字做图", en: "A chart for one number" }, chartId: "chTop", note: { zh: "工作台「热销产品」表格可直接读值。", en: "The top products table shows exact values." }, source: "课件 p.26" },
];

export const DESIGN_PROCESS = [
  { zh: "定义受众与决策", en: "Define audience and decision" },
  { zh: "从 KPI 矩阵选指标", en: "Select KPIs from the KPI matrix" },
  { zh: "确认数据与刷新频率", en: "Confirm data and refresh frequency" },
  { zh: "在纸上画布局线框", en: "Sketch the layout wireframe" },
  { zh: "为每个问题选图", en: "Select a chart for each question" },
  { zh: "做低保真原型", en: "Build a low-fidelity prototype" },
  { zh: "找代表用户测试", en: "Test with representative users" },
  { zh: "修订设计", en: "Revise the design" },
  { zh: "记录设计与数据血缘", en: "Document design and data lineage" },
  { zh: "上线后复核使用价值", en: "Review use and value after release" },
];

export const DESIGN_ERRORS = [
  { id: "noDecision", zh: "仪表板没有写明支持的决策", en: "No stated decision", source: "课件 p.33" },
  { id: "tooMany", zh: "一屏放了太多 KPI（超过 5–9 个）", en: "Too many KPIs on one screen", source: "课件 p.28 / p.33" },
  { id: "noTarget", zh: "KPI 没有目标", en: "KPIs without targets", source: "课件 p.33" },
  { id: "colourOnly", zh: "状态只靠颜色，没有文字或图标", en: "Status uses colour alone", source: "课件 p.30 / p.33" },
  { id: "gauge3d", zh: "使用仪表盘或 3D 图浪费空间", en: "Gauges and 3D charts waste space", source: "课件 p.26 / p.33" },
  { id: "manyPies", zh: "饼图包含过多切片", en: "Pie charts with many slices", source: "课件 p.26 / p.33" },
  { id: "truncatedAxis", zh: "截断坐标轴却没有清楚标注", en: "Truncated axes without a clear label", source: "课件 p.33" },
  { id: "inconsistent", zh: "同一 KPI 在不同仪表板算法不同", en: "One KPI calculated differently across dashboards", source: "课件 p.33 / 讲义 §15" },
  { id: "hideFreshness", zh: "隐藏数据刷新时间", en: "Hidden data refresh time", source: "课件 p.33" },
  { id: "hideDetail", zh: "汇总绿色状态掩盖明细问题", en: "Summary status hides detail problems", source: "课件 p.33" },
];

export const GOVERNANCE = [
  { risk: { zh: "误导刻度夸大变化", en: "Misleading scale exaggerates change" }, control: { zh: "条形图从 0 开始；截断轴必须标注", en: "Start bars at zero; label truncated axes" }, source: "讲义 §18" },
  { risk: { zh: "选择性展示隐藏差结果", en: "Selective display hides poor results" }, control: { zh: "显示已批准 scorecard 的全部 KPI", en: "Show every KPI from the approved scorecard" }, source: "讲义 §18" },
  { risk: { zh: "个人数据被错误用户看到", en: "Personal data reaches the wrong user" }, control: { zh: "在语义模型实施行级安全", en: "Apply row-level security in the semantic model" }, source: "讲义 §18" },
  { risk: { zh: "无障碍设计排除用户", en: "Inaccessible design excludes users" }, control: { zh: "标签、对比度、键盘访问、替代文本；WCAG 2.2", en: "Labels, contrast, keyboard access, alt text; WCAG 2.2" }, source: "课件 p.30 / 讲义 §18" },
  { risk: { zh: "陈旧数据驱动决策", en: "Stale data drives decisions" }, control: { zh: "显示刷新时间与数据完整性", en: "Show refresh time and data completeness" }, source: "讲义 §18" },
  { risk: { zh: "未批准变更改变含义", en: "Unapproved changes alter meaning" }, control: { zh: "版本控制并记录变更", en: "Version control dashboards and record changes" }, source: "讲义 §18" },
];

export const PAPER_LENS = [
  { id: "purpose", zh: "目的：决策支持、沟通、学习、激励", en: "Purpose: decision support, communication, learning, motivation", source: "论文 §3.2" },
  { id: "audience", zh: "受众：公共、社交、组织、个人；图表读写能力不同", en: "Audience: public, social, organisational, individual; different literacy", source: "论文 §3.3" },
  { id: "visual", zh: "视觉与交互：可组合、多页、筛选、联动、标注", en: "Visual & interaction: composition, multipage, filters, cross-highlight, annotation", source: "论文 §3.4" },
  { id: "semantics", zh: "数据语义：告警、基准、可更新性", en: "Data semantics: alerting, benchmarks, updatable data", source: "论文 §3.5" },
];

export const PAPER_GENRES = [
  { id: "visual", zh: "视觉取向：平铺小图 + 大数字，强调一眼可扫", en: "Visual genre: tiled charts and large numbers for glanceable reading", source: "论文 p.1–2" },
  { id: "functional", zh: "功能取向：实时、动态、交互的监控界面", en: "Functional genre: real-time, dynamic, interactive monitoring", source: "论文 p.1–2" },
];

export const DESIGN_DICT = {
  zh: {
    panelTag: "MBIC 807 · WEEK 12 设计评审",
    panelTitle: "把课件原则变成可检查的仪表板",
    panelDesc: "按「先定决策，再选 KPI 与图」的顺序检查当前工作台。所有结论标注课件 / 讲义 / 论文来源；目标与阈值由你输入，不冒充已批准矩阵。",
    source: "来源",
    tabRequirement: "① 需求陈述",
    tabKpi: "② KPI 卡",
    tabChart: "③ 图表选择",
    tabDrill: "④ 两级钻取",
    tabAudit: "⑤ 设计自检",
    reqTitle: "从决策写出需求",
    reqDesc: "课件要求先回答 7 个问题，再画任何图。填写下面字段，右侧会生成需求陈述。",
    audience: "受众 / 谁使用",
    cadence: "使用频率",
    decision: "支持的决策",
    kpis: "相关 KPI",
    targets: "目标",
    action: "红色状态的行动",
    detail: "告警后需要的明细",
    access: "可见数据范围",
    preview: "生成的需求陈述",
    reset: "恢复示例",
    copy: "复制陈述",
    copied: "已复制",
    copyFail: "复制失败，请手动选择文本",
    kpiTitle: "KPI 卡：当前值 / 目标 / 状态 / 趋势",
    kpiDesc: "输入目标后按相对阈值判定：达到目标为达标，低于目标 10% 以内为关注，低于 20% 以上为异常。低值更好型指标反向判定。",
    thresholdNote: "演示阈值（目标 −10% / −20%），真实项目必须用 Week 11 KPI 矩阵与语义模型中的批准阈值。",
    current: "当前值",
    targetShort: "目标",
    status: "状态",
    trend: "趋势",
    polarityHigh: "越高越好",
    polarityLow: "越低越好",
    noTarget: "未设目标",
    good: "达标",
    warn: "关注",
    bad: "异常",
    vsPrior: "较上一周期",
    noPrior: "无上一周期可比较",
    noTrend: "无时间序列",
    sparkline: "近 6 期趋势",
    setDemoTargets: "填入演示目标",
    demoTargetsSet: "已填入演示目标，仅用于查看状态效果",
    chartTitle: "按分析问题选图",
    chartDesc: "点击问题查看推荐与禁忌。不是先挑好看的图，而是先问你在回答什么。",
    question: "分析问题",
    recommend: "推荐",
    avoid: "避免",
    inWorkbench: "工作台对应实现",
    openChart: "查看对应图表",
    notBuilt: "未内置",
    chartNote: "说明",
    drillTitle: "两级仪表板：从结果下钻到原因",
    drillDesc: "Level 1 回答「有没有问题」，Level 2 回答「为什么、谁处理」。点一个 Level 1 KPI，再看它在维度上的拆分。",
    level1: "Level 1 · 结果 KPI",
    level2: "Level 2 · 驱动拆分",
    driver: "拆分维度",
    share: "占比",
    ownerAction: "红色状态行动（来自需求陈述）",
    noAction: "尚未填写行动，请在「需求陈述」中补充",
    drillNote: "此演示用现有品类 / 区域 / 渠道数据作驱动维度；正式项目应按 Week 11 KPI 树连接驱动 KPI，并保持每层 KPI 定义不变。",
    auditTitle: "上线前自检：勾选已经做到的项",
    auditDesc: "覆盖课件 p.33 的常见错误与讲义 §18 的治理控制。未勾选的项目就是下一次修订清单。",
    passed: "已通过",
    items: "项",
    export: "导出设计说明",
    processTitle: "设计流程（10 步）",
    lensTitle: "论文视角：仪表板设计空间",
    genresTitle: "视觉取向 vs 功能取向",
    governanceTitle: "伦理、无障碍与治理",
    refreshTitle: "数据载入时间",
    demoSource: "内置示例数据",
    accountSource: "当前账户数据",
    smartSource: "本地上传数据集",
  },
  en: {
    panelTag: "MBIC 807 · WEEK 12 DESIGN REVIEW",
    panelTitle: "Turn lecture principles into a checkable dashboard",
    panelDesc: "Review the current workbench in the order: decide first, then choose KPIs and charts. Every rule cites slides, notes or the paper; targets and thresholds are entered by you, not presented as approved values.",
    source: "Source",
    tabRequirement: "1 Requirement",
    tabKpi: "2 KPI tile",
    tabChart: "3 Chart choice",
    tabDrill: "4 Two levels",
    tabAudit: "5 Self-check",
    reqTitle: "Write the requirement from the decision",
    reqDesc: "The slides ask seven questions before any chart. Fill in the fields and the statement is generated on the right.",
    audience: "Audience / who uses it",
    cadence: "How often",
    decision: "Decision supported",
    kpis: "Relevant KPIs",
    targets: "Targets",
    action: "Action on red status",
    detail: "Detail needed after an alert",
    access: "Data the user may see",
    preview: "Generated requirement statement",
    reset: "Restore example",
    copy: "Copy statement",
    copied: "Copied",
    copyFail: "Copy failed; select the text manually",
    kpiTitle: "KPI tile: value / target / status / trend",
    kpiDesc: "After you enter a target: on target is good, within 10% below is a warning, more than 20% below is a problem. Lower-is-better KPIs are reversed.",
    thresholdNote: "Demo thresholds (target −10% / −20%). Real projects must use approved thresholds from the Week 11 KPI matrix and semantic model.",
    current: "Current value",
    targetShort: "Target",
    status: "Status",
    trend: "Trend",
    polarityHigh: "Higher is better",
    polarityLow: "Lower is better",
    noTarget: "No target",
    good: "On target",
    warn: "Watch",
    bad: "Problem",
    vsPrior: "vs previous period",
    noPrior: "No previous period",
    noTrend: "No time series",
    sparkline: "Last 6 periods",
    setDemoTargets: "Fill demo targets",
    demoTargetsSet: "Demo targets filled — for preview only",
    chartTitle: "Choose the chart from the question",
    chartDesc: "Click a question to see what to use and what to avoid. Do not start with a pretty chart; start with the question.",
    question: "Analytical question",
    recommend: "Use",
    avoid: "Avoid",
    inWorkbench: "Workbench implementation",
    openChart: "Open matching chart",
    notBuilt: "Not built in",
    chartNote: "Note",
    drillTitle: "Two-level dashboard: from outcome to cause",
    drillDesc: "Level 1 answers whether there is a problem. Level 2 answers why and who acts. Pick a Level 1 KPI, then view its dimension breakdown.",
    level1: "Level 1 · outcome KPI",
    level2: "Level 2 · driver breakdown",
    driver: "Breakdown dimension",
    share: "Share",
    ownerAction: "Action on red status (from requirement)",
    noAction: "No action yet — add one in the requirement tab",
    drillNote: "This demo uses existing category / region / channel data as driver dimensions. A real project should connect to driver KPIs in the Week 11 KPI tree, keeping the KPI definition unchanged at each level.",
    auditTitle: "Pre-release self-check: tick what is already done",
    auditDesc: "Covers the common errors on slides p.33 and the governance controls in notes §18. Unticked items become the next revision list.",
    passed: "Passed",
    items: "items",
    export: "Export design brief",
    processTitle: "Design process (10 steps)",
    lensTitle: "Paper lens: dashboard design space",
    genresTitle: "Visual genre vs functional genre",
    governanceTitle: "Ethics, accessibility and governance",
    refreshTitle: "Data loaded at",
    demoSource: "Built-in sample data",
    accountSource: "Current account data",
    smartSource: "Local uploaded dataset",
  },
};

export function dt(lang, key, vars = {}) {
  const text = (DESIGN_DICT[lang] || DESIGN_DICT.zh)[key] || DESIGN_DICT.zh[key] || key;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll("{" + k + "}", String(v)), text);
}

export function requirementDefaults(lang) {
  return lang === "en"
    ? {
        audience: "Store managers",
        cadence: "daily",
        decision: "which regions need restocking or promotion",
        kpis: "revenue, profit margin, order count",
        targets: "revenue ≥ target, margin ≥ target",
        action: "the regional manager follows up the same day",
        detail: "breakdown by region and product category",
        access: "only managers of this store",
      }
    : {
        audience: "门店经理",
        cadence: "每天",
        decision: "哪些区域需要补货或促销",
        kpis: "营收、毛利率、订单数",
        targets: "营收 ≥ 目标、毛利率 ≥ 目标",
        action: "区域经理在当天跟进",
        detail: "按区域和品类拆分",
        access: "仅本店经理可见",
      };
}

export function buildRequirement(fields, lang) {
  const f = { ...requirementDefaults(lang), ...(fields || {}) };
  if (lang === "en") {
    return `The ${f.audience} uses the dashboard ${f.cadence} to decide ${f.decision}. The dashboard shows ${f.kpis} against ${f.targets}. A red status prompts ${f.action}. After an alert, the user needs ${f.detail}. The dashboard is visible to ${f.access}.`;
  }
  return `${f.audience}${f.cadence}使用本仪表板，用于决定${f.decision}。仪表板显示${f.kpis}，并与${f.targets}对比。红色状态触发：${f.action}。告警后用户需要${f.detail}。可见数据范围：${f.access}。`;
}

export function ragStatus(current, target, polarity = "higher", tolerance = { amber: 0.1, red: 0.2 }) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target === 0) {
    return { key: "none", text: "noTarget", icon: "—", ratio: null };
  }
  const ratio = polarity === "lower" ? target / current : current / target;
  const amber = Math.max(0, Number(tolerance.amber) || 0);
  const red = Math.max(amber, Number(tolerance.red) || 0);
  if (ratio >= 1) return { key: "good", text: "good", icon: "✓", ratio };
  if (ratio >= 1 - amber) return { key: "warn", text: "warn", icon: "!", ratio };
  if (ratio >= 1 - red) return { key: "bad", text: "bad", icon: "▲", ratio };
  return { key: "bad", text: "bad", icon: "▲", ratio };
}

export function rangeSlices(monthly, range = "all") {
  const all = Array.isArray(monthly) ? monthly : [];
  const keep = range === "all" ? all.length : range === "12m" ? 12 : range === "6m" ? 6 : 3;
  const n = Math.max(0, Math.min(keep, all.length));
  return { current: all.slice(all.length - n), prior: all.slice(Math.max(0, all.length - 2 * n), all.length - n) };
}

const sumCol = (rows, i) => rows.reduce((s, r) => s + (Number(r?.[i]) || 0), 0);
const formatNumber = (v, kind, lang) => {
  if (!Number.isFinite(v)) return "—";
  if (kind === "money") return (lang === "en" ? "NZ$ " : "NZ$ ") + v.toLocaleString(lang === "en" ? "en-NZ" : "en-NZ", { maximumFractionDigits: 0 });
  if (kind === "percent") return v.toFixed(1) + "%";
  return Math.round(v).toLocaleString("en-NZ");
};

export function buildKpiTiles(agg, targets = {}, range = "all", lang = "zh") {
  const { current, prior } = rangeSlices(agg?.monthly, range);
  const rev = sumCol(current, 1), profit = sumCol(current, 2);
  const prevRev = sumCol(prior, 1), prevProfit = sumCol(prior, 2);
  const margin = rev ? (profit / rev) * 100 : 0;
  const prevMargin = prevRev ? (prevProfit / prevRev) * 100 : null;
  const orders = sumCol(current, 3), prevOrders = sumCol(prior, 3);
  const customers = Number(agg?.meta?.customers) || 0;
  const defs = [
    { id: "revenue", name: { zh: "营收", en: "Revenue" }, value: rev, prior: prevRev, kind: "money", series: current.map((r) => Number(r[1]) || 0), polarity: "higher", targetKey: "revenue" },
    { id: "margin", name: { zh: "毛利率", en: "Profit margin" }, value: margin, prior: prevMargin, kind: "percent", series: current.map((r) => { const m = Number(r[1]) || 0; return m ? ((Number(r[2]) || 0) / m) * 100 : 0; }), polarity: "higher", targetKey: "margin" },
    { id: "orders", name: { zh: "订单数", en: "Orders" }, value: orders, prior: prevOrders, kind: "count", series: current.map((r) => Number(r[3]) || 0), polarity: "higher", targetKey: "orders" },
    { id: "customers", name: { zh: "客户数", en: "Customers" }, value: customers, prior: null, kind: "count", series: [], polarity: "higher", targetKey: "customers" },
  ];
  return defs.map((d) => {
    const target = Number(targets[d.targetKey]);
    const hasTarget = Number.isFinite(target) && target !== 0;
    return {
      ...d,
      target: hasTarget ? target : null,
      targetLabel: hasTarget ? formatNumber(target, d.kind, lang) : dt(lang, "noTarget"),
      valueLabel: formatNumber(d.value, d.kind, lang),
      status: ragStatus(d.value, hasTarget ? target : NaN, d.polarity),
      delta: d.prior === null || !Number.isFinite(d.prior) || d.prior === 0 ? null : ((d.value - d.prior) / Math.abs(d.prior)) * 100,
    };
  });
}

export function sparklinePoints(values, width = 96, height = 30) {
  const nums = (values || []).filter((v) => Number.isFinite(v));
  if (nums.length < 2) return "";
  const min = Math.min(...nums), max = Math.max(...nums), span = max - min || 1;
  return nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function drilldownRows(agg, kpiId, dimension = "category", lang = "zh") {
  const keyMap = { category: "category", region: "region", channel: "channel" };
  const rows = agg?.[keyMap[dimension] || "category"] || [];
  const index = kpiId === "margin" ? (a, b) => (b[2] / (b[1] || 1)) * 100 - (a[2] / (a[1] || 1)) * 100 : kpiId === "orders" ? (a, b) => (b[3] || 0) - (a[3] || 0) : (a, b) => (b[1] || 0) - (a[1] || 0);
  const valueOf = (r) => {
    if (kpiId === "margin") return (r[1] || 0) ? ((r[2] || 0) / r[1]) * 100 : 0;
    if (kpiId === "orders") return Number(r[3]) || 0;
    return Number(r[1]) || 0;
  };
  const sorted = rows.slice().sort(index).slice(0, 6);
  const total = sorted.reduce((s, r) => s + valueOf(r), 0);
  return sorted.map((r) => {
    const value = valueOf(r);
    return {
      name: String(r[0]),
      value,
      valueLabel: kpiId === "margin" ? value.toFixed(1) + "%" : kpiId === "orders" ? String(Math.round(value)) : formatNumber(value, "money", lang),
      share: total ? (value / total) * 100 : 0,
    };
  });
}

export function scoreAudit(checks) {
  const total = DESIGN_ERRORS.length;
  const passed = DESIGN_ERRORS.filter((e) => !!(checks || {})[e.id]).length;
  return { passed, total, pct: total ? (passed / total) * 100 : 0 };
}

export function buildDesignBrief(payload, lang) {
  const p = payload || {};
  const requirement = p.requirement || buildRequirement(p.fields, lang);
  const tiles = p.tiles || [];
  const chart = CHART_RULES.find((r) => r.id === p.chartId) || CHART_RULES[0];
  const audit = scoreAudit(p.checks);
  const lines = [
    `# ${dt(lang, "panelTitle")}`,
    "",
    `> ${dt(lang, "panelDesc")}`,
    "",
    `## ${dt(lang, "tabRequirement")}`,
    requirement,
    "",
    `## ${dt(lang, "tabKpi")}`,
    ...tiles.map((k) => `- ${k.name[lang] || k.name.zh}: ${k.valueLabel} / ${dt(lang, "targetShort")} ${k.targetLabel} / ${dt(lang, "status")} ${k.status.key} / ${k.series.length ? dt(lang, "sparkline") : dt(lang, "noTrend")}`),
    "",
    `## ${dt(lang, "tabChart")}`,
    `- ${chart.q[lang]}: ${chart.use[lang]} (${dt(lang, "avoid")}: ${chart.avoid[lang]})`,
    "",
    `## ${dt(lang, "tabDrill")}`,
    `- Level 1 → Level 2: ${dt(lang, "drillNote")}`,
    `- ${dt(lang, "ownerAction")}: ${p.action || dt(lang, "noAction")}`,
    "",
    `## ${dt(lang, "tabAudit")}`,
    `${dt(lang, "passed")}: ${audit.passed}/${audit.total}`,
    ...DESIGN_ERRORS.map((e) => `- [${checksMark(p.checks, e.id)}] ${e[lang]}`),
    "",
    `## ${dt(lang, "source")}`,
    ...SOURCES.map((s) => `- ${s.label[lang]}: ${s.note[lang]}`),
    "",
    `- Sarikaya, A., Correll, M., Bartram, L., Tory, M., & Fisher, D. (2019). What do we talk about when we talk about dashboards? IEEE TVCG, 25(1), 682–692.`,
  ];
  return lines.join("\n");
}

function checksMark(checks, id) {
  return checks && checks[id] ? "x" : " ";
}
