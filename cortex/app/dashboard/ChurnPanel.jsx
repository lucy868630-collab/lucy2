"use client";

import { useEffect, useMemo, useRef } from "react";
import { Chart } from "chart.js/auto";
import { computeChurn, normalizeRows, sampleChurnRows } from "../../lib/churn";

const REASON_KEY = {
  long_absence: "churnReasonLong",
  activity_drop: "churnReasonDrop",
  low_frequency: "churnReasonFreq",
  spend_decline: "churnReasonSpend",
  stable: "churnReasonStable",
};

const tr = (s, vars) =>
  Object.entries(vars || {}).reduce((acc, [k, v]) => acc.replace("{" + k + "}", v), s);

export default function ChurnPanel({ rawRows, lang, t }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const churn = useMemo(() => {
    const rows = rawRows ? normalizeRows(rawRows) : sampleChurnRows();
    return computeChurn(rows, { isSample: !rawRows });
  }, [rawRows]);

  useEffect(() => {
    if (!churn.available || !canvasRef.current) return;
    const legend = { position: "bottom", labels: { boxWidth: 10, usePointStyle: true, padding: 16 } };
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: churn.trend.map((w) => w.label),
        datasets: [
          { label: t.churnHigh, data: churn.trend.map((w) => w.high), borderColor: "#ff5c7a", backgroundColor: "rgba(255,92,122,.12)", fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2 },
          { label: t.churnMid, data: churn.trend.map((w) => w.medium), borderColor: "#ffb84f", backgroundColor: "transparent", tension: 0.35, pointRadius: 3, borderWidth: 2 },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(35,44,62,.35)" } },
          x: { grid: { display: false } },
        },
      },
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [churn, lang, t]);

  const bands = [
    { key: "high", cls: "high", label: t.churnHigh, count: churn.counts.high, sub: t.churnHighSub, advice: t.churnAdviceHigh },
    { key: "medium", cls: "mid", label: t.churnMid, count: churn.counts.medium, sub: t.churnMidSub, advice: t.churnAdviceMid },
    { key: "low", cls: "low", label: t.churnLow, count: churn.counts.low, sub: t.churnLowSub, advice: t.churnAdviceLow },
  ];
  const deltaText = churn.deltaHigh < 0
    ? tr(t.churnImproved, { N: Math.abs(churn.deltaHigh) })
    : churn.deltaHigh > 0
      ? tr(t.churnWorsened, { N: churn.deltaHigh })
      : t.churnStable;
  const focus = churn.available ? [...churn.high, ...churn.medium].slice(0, 12) : [];

  return (
    <section className="section" id="sec-churn">
      <div className="section-head"><h2>{t.churnTitle}</h2><p>{t.churnDesc}</p></div>

      {!churn.available ? (
        <div className="card"><div className="report-empty">{t.churnNoData}</div></div>
      ) : (
        <>
          {churn.isSample && <div className="churn-sample">{t.churnSample}</div>}

          <div className="churn-bands">
            {bands.map((b) => (
              <div className={"churn-band " + b.cls} key={b.key}>
                <div className="label">{b.label}</div>
                <div className="value">{b.count} <small>{t.churnCustomers}</small></div>
                <div className="delta">{b.sub}<br />{b.advice}</div>
              </div>
            ))}
            <div className="churn-band trend">
              <div className="label">{t.churnTrend}</div>
              <div className="value">{churn.riskRate}%</div>
              <div className="delta">
                {t.churnRiskRate} · {t.churnAvgScore} {churn.avgScore}<br />{deltaText}
              </div>
            </div>
          </div>

          <div className="cards-even">
            <div className="card">
              <div className="card-head"><h3>{t.churnListTitle}</h3><span>{tr(t.churnAsOf, { DATE: churn.asOf })}</span></div>
              <div className="churn-list">
                <table>
                  <thead>
                    <tr>
                      <th>{t.churnColCustomer}</th><th className="num">{t.churnColScore}</th>
                      <th>{t.churnColSignal}</th><th className="num">{t.churnColLast}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {focus.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td className="num"><span className={"churn-tag " + (c.band === "medium" ? "mid" : c.band)}>{c.score}</span></td>
                        <td>{c.reasons.map((r) => t[REASON_KEY[r]] || r).join(" · ")}</td>
                        <td className="num">{tr(t.churnDaysAgo, { N: c.recency })}</td>
                      </tr>
                    ))}
                    {!focus.length && <tr><td colSpan="4">{t.churnEmptyList}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>{t.churnTrend}</h3><span>{t.churnTrendSub}</span></div>
              <div className="chart-box"><canvas ref={canvasRef}></canvas></div>
            </div>
          </div>

          <div className="churn-note">{t.churnMethod}</div>
        </>
      )}
    </section>
  );
}
