"use client";

import { useMemo, useState } from "react";
import {
  CHART_RULES, DASHBOARD_TYPES, DESIGN_DICT, DESIGN_ERRORS, DESIGN_PROCESS,
  GOVERNANCE, KPI_QUESTIONS, PAPER_GENRES, PAPER_LENS, SOURCES,
  buildDesignBrief, buildKpiTiles, buildRequirement, drilldownRows, dt,
  requirementDefaults, scoreAudit, sparklinePoints,
} from "../../lib/dashboardDesign";

const TABS = [
  ["requirement", "tabRequirement"],
  ["kpi", "tabKpi"],
  ["chart", "tabChart"],
  ["drill", "tabDrill"],
  ["audit", "tabAudit"],
];

export default function DashboardDesignPanel({ agg, lang, range, refreshedAt, sourceLabel }) {
  const [tab, setTab] = useState("requirement");
  const [fields, setFields] = useState(() => requirementDefaults(lang));
  const [targets, setTargets] = useState({});
  const [checks, setChecks] = useState({});
  const [chartId, setChartId] = useState("target");
  const [kpiId, setKpiId] = useState("revenue");
  const [dimension, setDimension] = useState("category");
  const [copied, setCopied] = useState(false);

  const dict = DESIGN_DICT[lang] || DESIGN_DICT.zh;
  const tiles = useMemo(() => buildKpiTiles(agg, targets, range, lang), [agg, targets, range, lang]);
  const requirement = useMemo(() => buildRequirement(fields, lang), [fields, lang]);
  const chart = CHART_RULES.find((r) => r.id === chartId) || CHART_RULES[0];
  const drillRows = useMemo(() => drilldownRows(agg, kpiId, dimension, lang), [agg, kpiId, dimension, lang]);
  const audit = useMemo(() => scoreAudit(checks), [checks]);
  const activeKpi = tiles.find((k) => k.id === kpiId) || tiles[0];

  const setField = (key, value) => setFields((f) => ({ ...f, [key]: value }));
  const setTarget = (key, value) => setTargets((t) => ({ ...t, [key]: value === "" ? NaN : Number(value) }));
  const fillDemoTargets = () => {
    setTargets({
      revenue: tiles[0].value * 1.1,
      margin: tiles[1].value + 5,
      orders: tiles[2].value * 1.15,
      customers: tiles[3].value * 1.05,
    });
    setCopied(false);
  };
  const copyStatement = async () => {
    try {
      await navigator.clipboard.writeText(requirement);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const exportBrief = () => {
    const text = buildDesignBrief({ fields, requirement, tiles, chartId, checks, action: fields.action }, lang);
    const blob = new Blob(["\uFEFF" + text], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dashboard-design-brief-" + new Date().toISOString().slice(0, 10) + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const openChart = (id) => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="section design-review" id="sec-design">
      <div className="section-head">
        <h2>{dt(lang, "panelTitle")}</h2>
        <p>{dt(lang, "panelDesc")}</p>
      </div>

      <div className="design-top">
        <div className="design-tag">{dt(lang, "panelTag")}</div>
        <div className="design-meta">
          <span>{dt(lang, "source")}: {sourceLabel || dt(lang, "demoSource")}</span>
          <span>{dt(lang, "refreshTitle")}: {refreshedAt ? refreshedAt : (sourceLabel ? "—" : dt(lang, "demoSource"))}</span>
        </div>
      </div>

      <div className="design-tabs">
        {TABS.map(([id, key]) => (
          <button key={id} type="button" aria-pressed={tab === id} className={"design-tab" + (tab === id ? " on" : "")}
            onClick={() => setTab(id)}>{dt(lang, key)}</button>
        ))}
      </div>

      {tab === "requirement" && (
        <div className="design-grid">
          <div className="card design-form">
            <div className="card-head"><h3>{dt(lang, "reqTitle")}</h3><span>{dt(lang, "source")}: 课件 p.24 / 讲义 §6</span></div>
            <p className="design-desc">{dt(lang, "reqDesc")}</p>
            <div className="design-fields">
              <label><span>{dt(lang, "audience")}</span><input value={fields.audience} onChange={(e) => setField("audience", e.target.value)} /></label>
              <label><span>{dt(lang, "cadence")}</span><input value={fields.cadence} onChange={(e) => setField("cadence", e.target.value)} /></label>
              <label className="wide"><span>{dt(lang, "decision")}</span><input value={fields.decision} onChange={(e) => setField("decision", e.target.value)} /></label>
              <label className="wide"><span>{dt(lang, "kpis")}</span><input value={fields.kpis} onChange={(e) => setField("kpis", e.target.value)} /></label>
              <label><span>{dt(lang, "targets")}</span><input value={fields.targets} onChange={(e) => setField("targets", e.target.value)} /></label>
              <label><span>{dt(lang, "action")}</span><input value={fields.action} onChange={(e) => setField("action", e.target.value)} /></label>
              <label><span>{dt(lang, "detail")}</span><input value={fields.detail} onChange={(e) => setField("detail", e.target.value)} /></label>
              <label><span>{dt(lang, "access")}</span><input value={fields.access} onChange={(e) => setField("access", e.target.value)} /></label>
            </div>
            <div className="design-actions">
              <button type="button" className="btn btn-ghost small" onClick={() => setFields(requirementDefaults(lang))}>{dt(lang, "reset")}</button>
            </div>
          </div>
          <div className="card design-result">
            <div className="card-head"><h3>{dt(lang, "preview")}</h3><span>{dict.source}: 课件 p.24</span></div>
            <div className="design-statement">{requirement}</div>
            <div className="design-actions">
              <button type="button" className="btn btn-primary small" onClick={copyStatement}>{copied ? dt(lang, "copied") : dt(lang, "copy")}</button>
            </div>
            <div className="design-subhead">{dt(lang, "lensTitle")}</div>
            <div className="design-paper-grid">
              {PAPER_LENS.map((p) => (
                <div className="design-paper-item" key={p.id}><b>{p[lang]}</b><small>{p.source}</small></div>
              ))}
            </div>
            <div className="design-subhead">{dt(lang, "genresTitle")}</div>
            <div className="design-genres">
              {PAPER_GENRES.map((g) => <div key={g.id}><b>{g[lang]}</b><small>{g.source}</small></div>)}
            </div>
          </div>
        </div>
      )}

      {tab === "kpi" && (
        <div>
          <div className="card">
            <div className="card-head"><h3>{dt(lang, "kpiTitle")}</h3><span>{dt(lang, "source")}: 课件 p.27 / 讲义 §9</span></div>
            <p className="design-desc">{dt(lang, "kpiDesc")}</p>
            <div className="design-actions">
              <button type="button" className="btn btn-ghost small" onClick={fillDemoTargets}>{dt(lang, "setDemoTargets")}</button>
            </div>
            <div className="note">{dt(lang, "thresholdNote")}</div>
          </div>
          <div className="design-kpi-grid">
            {tiles.map((k) => {
              const points = sparklinePoints(k.series.slice(-6));
              const statusText = k.status.key === "none" ? dt(lang, k.status.text) : dt(lang, k.status.text);
              const deltaText = k.delta === null ? dt(lang, "noPrior") : `${k.delta >= 0 ? "▲" : "▼"} ${Math.abs(k.delta).toFixed(1)}% ${dt(lang, "vsPrior")}`;
              return (
                <div className="design-kpi" key={k.id}>
                  <div className="design-kpi-head"><b>{k.name[lang]}</b><span className={"design-status " + k.status.key}>{k.status.icon} {statusText}</span></div>
                  <div className="design-kpi-value">{k.valueLabel}</div>
                  <div className="design-kpi-row"><span>{dt(lang, "targetShort")}</span><input type="number" step="any" value={Number.isFinite(k.target) ? k.target : ""} placeholder="—" onChange={(e) => setTarget(k.targetKey, e.target.value)} /><b>{k.targetLabel}</b></div>
                  <div className="design-kpi-row"><span>{dt(lang, "trend")}</span><div className="design-spark">{points ? <svg viewBox="0 0 96 30" preserveAspectRatio="none" aria-label={dt(lang, "sparkline")}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg> : <em>{dt(lang, "noTrend")}</em>}</div></div>
                  <div className="design-kpi-delta">{deltaText}</div>
                </div>
              );
            })}
          </div>
          <div className="card design-questions">
            <div className="card-head"><h3>{dt(lang, "panelTitle")} · {dt(lang, "tabKpi")}</h3><span>{dt(lang, "source")}: 课件 p.27</span></div>
            <div className="design-question-list">
              {KPI_QUESTIONS.map((q, i) => <div key={q.id}><span className="design-qnum">{i + 1}</span><b>{q[lang]}</b></div>)}
            </div>
          </div>
        </div>
      )}

      {tab === "chart" && (
        <div className="design-grid">
          <div className="card">
            <div className="card-head"><h3>{dt(lang, "chartTitle")}</h3><span>{dt(lang, "source")}: 课件 p.26 / 讲义 §8</span></div>
            <p className="design-desc">{dt(lang, "chartDesc")}</p>
            <div className="design-chart-list">
              {CHART_RULES.map((r) => (
                <button type="button" key={r.id} aria-pressed={r.id === chartId} className={"design-chart-item" + (r.id === chartId ? " on" : "")} onClick={() => setChartId(r.id)}>
                  <span>{r.q[lang]}</span><small>{r.use[lang]}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="card design-chart-detail">
            <div className="card-head"><h3>{chart.q[lang]}</h3><span>{chart.source}</span></div>
            <div className="design-recommend"><span>{dt(lang, "recommend")}</span><b>{chart.use[lang]}</b></div>
            <div className="design-avoid"><span>{dt(lang, "avoid")}</span><b>{chart.avoid[lang]}</b></div>
            <div className="design-impl"><span>{dt(lang, "inWorkbench")}</span><b>{chart.chartId ? dt(lang, "openChart") : dt(lang, "notBuilt")}</b>{chart.chartId && <button type="button" className="btn btn-ghost small" onClick={() => openChart(chart.chartId)}>{dt(lang, "openChart")} →</button>}</div>
            <div className="note">{dt(lang, "chartNote")}: {chart.note[lang]}</div>
          </div>
        </div>
      )}

      {tab === "drill" && (
        <div>
          <div className="design-grid">
            <div className="card">
              <div className="card-head"><h3>{dt(lang, "level1")}</h3><span>{dt(lang, "source")}: 课件 p.31 / 讲义 §14</span></div>
              <div className="design-level1-list">
                {tiles.map((k) => (
                  <button type="button" key={k.id} aria-pressed={kpiId === k.id} className={"design-level1" + (kpiId === k.id ? " on" : "")} onClick={() => setKpiId(k.id)}>
                    <span>{k.name[lang]}</span><b>{k.valueLabel}</b><em className={"design-status " + k.status.key}>{k.status.icon} {dt(lang, k.status.text)}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>{dt(lang, "level2")}</h3><span>{activeKpi?.name[lang] || "—"}</span></div>
              <label className="design-select"><span>{dt(lang, "driver")}</span>
                <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
                  <option value="category">{lang === "en" ? "Product category" : "产品品类"}</option>
                  <option value="region">{lang === "en" ? "Region" : "区域"}</option>
                  <option value="channel">{lang === "en" ? "Channel" : "渠道"}</option>
                </select>
              </label>
              {drillRows.length ? (
                <table className="design-table">
                  <thead><tr><th>{dt(lang, "driver")}</th><th className="num">{dt(lang, "current")}</th><th className="num">{dt(lang, "share")}</th></tr></thead>
                  <tbody>{drillRows.map((r) => (
                    <tr key={r.name}><td>{r.name}<div className="bar"><i style={{ width: r.share + "%" }}></i></div></td><td className="num">{r.valueLabel}</td><td className="num">{r.share.toFixed(1)}%</td></tr>
                  ))}</tbody>
                </table>
              ) : <div className="note">{dt(lang, "noTrend")}</div>}
              <div className="design-action-box"><b>{dt(lang, "ownerAction")}</b><div>{fields.action || dt(lang, "noAction")}</div></div>
            </div>
          </div>
          <div className="note">{dt(lang, "drillNote")}</div>
          <div className="card design-types">
            <div className="card-head"><h3>{dt(lang, "panelTag")}</h3><span>{dt(lang, "source")}: 讲义 §5</span></div>
            <div className="design-type-grid">
              {DASHBOARD_TYPES.map((ty) => (
                <div key={ty.id}><b>{ty.audience[lang]}</b><span>{ty.horizon[lang]}</span><p>{ty.content[lang]}</p><small>{ty.source}</small></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="design-grid">
          <div className="card">
            <div className="card-head"><h3>{dt(lang, "auditTitle")}</h3><span>{dt(lang, "passed")}: {audit.passed}/{audit.total}</span></div>
            <p className="design-desc">{dt(lang, "auditDesc")}</p>
            <div className="design-audit-score"><div className="design-audit-bar"><i style={{ width: audit.pct + "%" }}></i></div><b>{audit.pct.toFixed(0)}%</b></div>
            <div className="design-check-list">
              {DESIGN_ERRORS.map((e) => (
                <label key={e.id} className={checks[e.id] ? "done" : ""}>
                  <input type="checkbox" checked={!!checks[e.id]} onChange={(ev) => setChecks((c) => ({ ...c, [e.id]: ev.target.checked }))} />
                  <span>{e[lang]}</span><small>{e.source}</small>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="card">
              <div className="card-head"><h3>{dt(lang, "processTitle")}</h3><span>{dt(lang, "source")}: 课件 p.32 / 讲义 §16</span></div>
              <ol className="design-process">
                {DESIGN_PROCESS.map((s, i) => <li key={i}><span>{i + 1}</span>{s[lang]}</li>)}
              </ol>
            </div>
            <div className="card">
              <div className="card-head"><h3>{dt(lang, "governanceTitle")}</h3><span>{dt(lang, "source")}: 讲义 §18 / 课件 p.30</span></div>
              <div className="design-gov-list">
                {GOVERNANCE.map((g, i) => <div key={i}><span>{g.risk[lang]}</span><b>{g.control[lang]}</b><small>{g.source}</small></div>)}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>{dt(lang, "source")}</h3><span>MBIC 807 · Week 12</span></div>
              <div className="design-source-list">
                {SOURCES.map((s) => <div key={s.id}><b>{s.label[lang]}</b><span>{s.note[lang]}</span></div>)}
              </div>
              <div className="design-actions"><button type="button" className="btn btn-primary small" onClick={exportBrief}>{dt(lang, "export")} ↓</button></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
