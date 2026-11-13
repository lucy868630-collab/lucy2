"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Chart } from "chart.js/auto";
import { T } from "../../lib/i18n";
import { buildSmartView } from "../../lib/smart";
import { normDate } from "../../lib/date";
import ChurnPanel from "./ChurnPanel";
import { supabase, supabaseConfigured } from "../../lib/supabaseClient";

const SAMPLE_AGG = {
  monthly: [["2025-11",566.78,335.14,33,69],["2025-12",795.91,428.63,38,74],["2026-01",668.64,364.88,38,65],["2026-02",628.71,387.74,39,86],["2026-03",653.86,383.29,46,83],["2026-04",636.96,369.41,45,75],["2026-05",809.05,485.28,50,105],["2026-06",672.44,382.52,39,73],["2026-07",621.46,382.22,44,80],["2026-08",664.62,398.8,45,91],["2026-09",741.19,409.75,39,73],["2026-10",631.8,387.55,40,88],["2026-11",33.96,22.64,4,6]],
  category: [["Retail Beans",2708.83,1218.93],["Lunch",1673.06,920.18],["Coffee",1482.78,1038.05],["Tea",1361.46,1021.14],["Bakery",899.25,539.55]],
  region: [["Auckland",2791.63,1655.07],["Wellington",1344.71,790.93],["Christchurch",1335.73,770.84],["Hamilton",1149.03,670.16],["Tauranga",854.53,475.17],["Dunedin",649.75,375.68]],
  channel: [["In-store",5413.83,3158.97],["Online",2711.55,1578.88]],
  top: [["House Blend 250g",971.73,437.28],["Single Origin 250g",884.94,398.21],["Decaf 250g",852.16,383.44],["Chai Latte",406.72,305.03],["Pie",391.19,215.17]],
  meta: { rows: 500, customers: 491 },
};

// 标准列 + 常见别名（大小写、BOM、空格都容错）
const FIELDS = {
  OrderDate:        ["orderdate", "date", "order_date"],
  OrderID:          ["orderid", "order_id", "id"],
  CustomerID:       ["customerid", "customer_id"],
  ProductCategory:  ["productcategory", "category", "product_category"],
  ProductName:      ["productname", "product", "product_name"],
  Region:           ["region", "city"],
  Channel:          ["channel"],
  PaymentMethod:    ["paymentmethod", "payment_method", "payment"],
  Quantity:         ["quantity", "qty"],
  UnitPrice_NZD:    ["unitprice_nzd", "unitprice", "unit_price_nzd"],
  Revenue_NZD:      ["revenue_nzd", "revenue"],
  Profit_NZD:       ["profit_nzd", "profit"],
};
const REQUIRED = ["OrderDate", "ProductCategory", "ProductName", "Region", "Channel", "Quantity", "Revenue_NZD", "Profit_NZD"];
const clean = (s) => String(s ?? "").replace(/^\uFEFF/, "").trim();
const keyOf = (s) => clean(s).toLowerCase().replace(/[\s_-]/g, "");

function mapColumns(fields) {
  const map = {};
  Object.keys(FIELDS).forEach((std) => {
    const aliases = FIELDS[std].map(keyOf);
    const found = fields.find((f) => aliases.includes(keyOf(f)));
    if (found) map[std] = found;
  });
  return map;
}

// 非销售数据的字段猜测（游客统计等）
const GUESS = {
  OrderDate: ["year", "date", "month", "period"],
  ProductCategory: ["category", "type", "segment", "purpose"],
  ProductName: ["product", "name", "item", "label"],
  Region: ["country", "region", "city", "market"],
  Channel: ["channel", "source", "segment"],
  Quantity: ["quantity", "qty", "arrivals", "visitors", "count"],
  Revenue_NZD: ["revenue", "spend", "sales", "amount", "total visitor spend"],
  Profit_NZD: ["profit", "margin"],
};
function guessMapping(fields) {
  const out = {};
  REQUIRED.forEach((std) => {
    const hits = GUESS[std] || [];
    out[std] = fields.find((f) => hits.some((h) => keyOf(f).includes(keyOf(h)))) || "";
  });
  return out;
}
const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function aggregateRows(rows) {
  const byMonth = {}, byCat = {}, byRegion = {}, byChan = {}, byProd = {};
  const bump = (o, k, rev, prof, ord, units) => {
    o[k] = o[k] || [0, 0, 0, 0];
    o[k][0] += rev; o[k][1] += prof; if (ord) o[k][2] += 1; o[k][3] += units;
  };
  rows.forEach((r) => {
    const d = new Date(r.order_date ?? r.OrderDate);
    if (isNaN(d)) return;
    const m = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const rev = +r.revenue || 0, prof = +r.profit || 0, q = +r.quantity || 0;
    bump(byMonth, m, rev, prof, true, q);
    bump(byCat, r.product_category ?? r.ProductCategory, rev, prof, true, q);
    bump(byRegion, r.region ?? r.Region, rev, prof, true, q);
    bump(byChan, r.channel ?? r.Channel, rev, prof, true, q);
    bump(byProd, r.product_name ?? r.ProductName, rev, prof, true, q);
  });
  const toArr = (o) => Object.entries(o).map(([k, v]) => [k, +v[0].toFixed(2), +v[1].toFixed(2), v[2], v[3]]);
  const byRev = (a) => a.sort((x, y) => y[1] - x[1]);
  return {
    monthly: toArr(byMonth).sort((a, b) => a[0].localeCompare(b[0])),
    category: byRev(toArr(byCat)), region: byRev(toArr(byRegion)), channel: byRev(toArr(byChan)),
    top: byRev(toArr(byProd)).slice(0, 5),
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState("zh");
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [agg, setAgg] = useState(SAMPLE_AGG);
  const [range, setRange] = useState("all");
  const [notice, setNotice] = useState(null);
  const [mapping, setMapping] = useState(null);   // {fields, rows}
  const [mapSel, setMapSel] = useState({});
  const [smart, setSmart] = useState(null);       // AI 数据画像 + 动态视图
  const [rawRows, setRawRows] = useState(null);   // 当前账户原始订单行，供流失风险计算
  const [profileBusy, setProfileBusy] = useState(false);
  const [busyUpload, setBusyUpload] = useState(false);
  const [report, setReport] = useState("");
  const [reportLang, setReportLang] = useState("zh");
  const [busyAI, setBusyAI] = useState(false);
  const [busyTranslate, setBusyTranslate] = useState(false);
  const chartsRef = useRef([]);
  const t = T[lang];
  const fmt = (n) => "NZ$ " + (+n).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (a, b) => (b > 0 ? (a / b * 100).toFixed(1) : "0");
  const tr = (s, vars) => Object.entries(vars || {}).reduce((acc, [k, v]) => acc.replace("{" + k + "}", v), s);

  function notify(kind, title, text, detail, template, canMap) {
    setNotice({ kind, title, text, detail, template, canMap });
    if (kind !== "error") setTimeout(() => setNotice((n) => (n && n.kind === kind ? null : n)), 8000);
  }

  useEffect(() => {
    const restoreDataset = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("cortex_dataset") || "null");
        if (saved?.rows?.length && saved?.profile) {
          const view = buildSmartView(saved.rows, saved.profile);
          setSmart(view);
          setAgg(view.agg);
          setRawRows(saved.rows);
        }
      } catch {}
    };
    if (!supabaseConfigured) { restoreDataset(); setReady(true); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/"); return; }
      setUser(data.session.user);
      await loadOrders(data.session.user.id);
      restoreDataset();
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") router.replace("/");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function loadOrders(userId) {
    const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("order_date", { ascending: true });
    if (error) { notify("error", t.errTitle, tr(t.errDb, { MSG: error.message })); return; }
    if (data && data.length) {
      const a = aggregateRows(data);
      a.meta = { rows: data.length, customers: new Set(data.map((r) => r.customer_id)).size };
      setAgg(a);
      setRawRows(data);
    }
  }

  useEffect(() => {
    if (!ready) return;
    chartsRef.current.forEach((c) => c.destroy());
    const $ = (id) => document.getElementById(id);
    if (!$) return;
    Chart.defaults.color = "#8b96ab";
    Chart.defaults.borderColor = "rgba(35,44,62,.45)";
    const ms = agg.monthly;
    const keep = range === "all" ? ms.length : range === "12m" ? 12 : range === "6m" ? 6 : 3;
    const slice = ms.slice(Math.max(0, ms.length - keep));
    const legend = { position: "bottom", labels: { boxWidth: 10, usePointStyle: true, padding: 16 } };
    chartsRef.current = [
      new Chart($("chMonthly"), { type: "line", data: {
        labels: slice.map((m) => m[0]),
        datasets: [
          { label: smart ? (lang === "en" ? smart.metrics[0]?.label_en : smart.metrics[0]?.label_zh) || t.legendRev : t.legendRev, data: slice.map((m) => m[1]), borderColor: "#4f8cff", backgroundColor: "rgba(79,140,255,.12)", fill: true, tension: .4, pointRadius: 3, borderWidth: 2 },
          ...(smart ? [] : [{ label: t.legendProfit, data: slice.map((m) => m[2]), borderColor: "#2ecc8f", backgroundColor: "rgba(46,204,143,.08)", fill: true, tension: .4, pointRadius: 3, borderWidth: 2 }]),
        ] }, options: { maintainAspectRatio: false, plugins: { legend }, scales: { y: { grid: { color: "rgba(35,44,62,.35)" } }, x: { grid: { display: false } } } } }),
      new Chart($("chCategory"), { type: "doughnut", data: {
        labels: agg.category.map((c) => c[0]),
        datasets: [{ data: agg.category.map((c) => c[1]), backgroundColor: ["#4f8cff", "#7c5cff", "#2ecc8f", "#ffb84f", "#ff5c7a", "#8b96ab"], borderWidth: 0, hoverOffset: 6 }] },
        options: { maintainAspectRatio: false, cutout: "66%", plugins: { legend } } }),
      new Chart($("chRegion"), { type: "bar", data: {
        labels: agg.region.map((r) => r[0]),
        datasets: [{ data: agg.region.map((r) => r[1]), backgroundColor: "rgba(79,140,255,.55)", borderRadius: 6 }] },
        options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(35,44,62,.35)" } }, y: { grid: { display: false } } } } }),
      new Chart($("chMargin"), { type: "bar", data: {
        labels: smart ? smart.marginSeries.labels : agg.category.map((c) => c[0]),
        datasets: [{ data: smart ? smart.marginSeries.values : agg.category.map((c) => pct(c[2], c[1])), backgroundColor: "rgba(124,92,255,.65)", borderRadius: 6 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: (v) => smart ? v : v + "%" }, grid: { color: "rgba(35,44,62,.35)" } }, y: { grid: { display: false } } } } }),
      new Chart($("chChannel"), { type: "doughnut", data: {
        labels: smart ? smart.channelSeries.labels : agg.channel.map((c) => c[0]),
        datasets: [{ data: smart ? smart.channelSeries.values : agg.channel.map((c) => c[1]), backgroundColor: ["#4f8cff", "#2ecc8f", "#7c5cff", "#ffb84f", "#ff5c7a", "#8b96ab"], borderWidth: 0, hoverOffset: 6 }] },
        options: { maintainAspectRatio: false, cutout: "66%", plugins: { legend } } }),
    ];
    return () => chartsRef.current.forEach((c) => c.destroy());
  }, [ready, agg, range, lang, smart]);

  const slice = (() => {
    const ms = agg.monthly;
    const keep = range === "all" ? ms.length : range === "12m" ? 12 : range === "6m" ? 6 : 3;
    return ms.slice(Math.max(0, ms.length - keep));
  })();
  const rev = slice.reduce((s, m) => s + m[1], 0);
  const prof = slice.reduce((s, m) => s + m[2], 0);
  const ord = slice.reduce((s, m) => s + m[3], 0);
  const units = slice.reduce((s, m) => s + m[4], 0);
  const maxTop = agg.top[0]?.[1] || 1;

  function downloadTemplate() {
    const header = ["OrderDate","OrderID","CustomerID","ProductCategory","ProductName","Region","Channel","PaymentMethod","Quantity","UnitPrice_NZD","UnitCost_NZD","Revenue_NZD","Cost_NZD","Profit_NZD"].join(",");
    const sample = "2026-01-15,ORD10001,CUST1001,Coffee,Flat White,Auckland,In-store,Card,2,5.50,1.65,11.00,3.30,7.70";
    const blob = new Blob(["\uFEFF" + header + "\n" + sample], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sales_template.csv";
    a.click();
  }

  const normRows = (raw) => raw.map((r) => {
    const o = {};
    Object.keys(r || {}).forEach((k) => {
      const v = r[k];
      if (v instanceof Date) o[clean(k)] = isNaN(v.getTime()) ? "" : normDate(v.toISOString());
      else if (typeof v === "object" && v !== null) o[clean(k)] = JSON.stringify(v);
      else o[clean(k)] = v;
    });
    return o;
  });

  // 不限制文件类型：能解析成表格的都接受
  async function parseAnyFile(file) {
    const mime = file.type || "";
    if (/^(image|audio|video)\/|pdf|zip|octet-stream|wordprocessing/.test(mime)) throw new Error("BINARY");
    const name = file.name.toLowerCase();

    if (/\.(xlsx|xls)$/.test(name)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const rows = normRows(raw);
      return { rows, fields: rows.length ? Object.keys(rows[0]) : [] };
    }
    if (/\.json$/.test(name)) {
      const j = JSON.parse(await file.text());
      const arr = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : [j];
      const rows = normRows(arr);
      return { rows, fields: rows.length ? Object.keys(rows[0]) : [] };
    }
    // CSV / TSV / TXT / 未知扩展名：一律按分隔文本解析
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, transformHeader: clean,
        complete: (res) => {
          const rows = normRows(res.data);
          const fields = (res.meta.fields || []).map(clean);
          const looksBinary = fields.length <= 1 && /\uFFFD/.test(JSON.stringify(rows.slice(0, 2)));
          resolve({ rows, fields, looksBinary });
        },
        error: reject,
      });
    });
  }

  // 自动字段识别：精确/别名 → 语义猜测 → 数值列推断
  function autoMap(fields, rows) {
    const exact = mapColumns(fields), guess = guessMapping(fields), sel = {};
    REQUIRED.forEach((std) => { sel[std] = exact[std] || guess[std] || ""; });
    if (!sel.Revenue_NZD) {
      sel.Revenue_NZD = fields.find((f) => {
        const vals = rows.slice(0, 15).map((r) => num(r[f]));
        return vals.filter((v) => v > 0).length >= Math.min(3, rows.length);
      }) || "";
    }
    if (!sel.OrderDate) {
      const parsesAsDate = (f) => rows.slice(0, 12).some((r) => normDate(r[f]) !== "");
      const dateNamed = (f) => /date|time|day|month|year|period|日期|时间|年|月/i.test(f);
      sel.OrderDate = fields.find((f) => dateNamed(f) && parsesAsDate(f))
        || fields.find(parsesAsDate) || "";
    }
    return sel;
  }

  function buildPayload(rows, sel, fileName) {
    const today = new Date().toISOString().slice(0, 10);
    const label = fileName.replace(/\.[^.]+$/, "") || "—";
    const g = (r, std) => (sel[std] ? r[sel[std]] : "");
    return rows.filter((r) => Object.values(r).some((v) => clean(v) !== "")).map((r) => ({
      user_id: user.id,
      order_date: normDate(g(r, "OrderDate")) || today,
      order_id: null, customer_id: null,
      product_category: clean(g(r, "ProductCategory")) || label,
      product_name: clean(g(r, "ProductName")) || clean(g(r, "ProductCategory")) || label,
      region: clean(g(r, "Region")) || "—",
      channel: clean(g(r, "Channel")) || "—",
      payment_method: null,
      quantity: num(g(r, "Quantity")) || 1,
      unit_price: 0,
      revenue: num(g(r, "Revenue_NZD")),
      profit: num(g(r, "Profit_NZD")),
    }));
  }

  // 已配置 Supabase 时，AI 接口要求携带 access token；演示模式走同源校验
  async function aiHeaders() {
    const h = { "Content-Type": "application/json" };
    if (supabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) h.Authorization = "Bearer " + data.session.access_token;
      } catch {}
    }
    return h;
  }

  // AI 读懂这份数据：识别领域、时间列、维度、指标，再切换成对应视图
  async function profileDataset(rows, fields, fileName) {
    setProfileBusy(true);
    try {
      const resp = await fetch("/api/profile", {
        method: "POST", headers: await aiHeaders(),
        body: JSON.stringify({ fields, sample: rows.slice(0, 6), rowCount: rows.length, fileName }),
      });
      const j = await resp.json();
      if (j.error && !j.profile) notify("error", t.errTitle, j.error);
      if (j.profile) {
        const view = buildSmartView(rows, j.profile);
        setSmart(view);
        setAgg(view.agg);
        try { localStorage.setItem("cortex_dataset", JSON.stringify({ rows: rows.slice(0, 5000), fields, profile: j.profile, fileName })); } catch {}
      }
    } catch {} finally { setProfileBusy(false); }
  }

  function clearDataset() {
    try { localStorage.removeItem("cortex_dataset"); } catch {}
    setSmart(null);
    setAgg(SAMPLE_AGG);
    setRawRows(null);
    if (user) loadOrders(user.id);
  }

  async function handleFile(file) {
    if (!file) return;
    setNotice(null);
    if (!supabaseConfigured || !user) { notify("error", t.errTitle, t.errNotReady); return; }
    setBusyUpload(true);
    try {
      const { rows, fields, looksBinary } = await parseAnyFile(file);
      if (looksBinary) { notify("error", t.errTitle, t.errBinary); return; }
      if (!rows.length || !fields.length) { notify("error", t.errTitle, t.errEmpty); return; }
      const sel = autoMap(fields, rows);
      const payload = buildPayload(rows, sel, file.name);
      if (!payload.length) { notify("error", t.errTitle, t.errEmpty); return; }
      const matched = REQUIRED.filter((c) => sel[c]).length;
      setMapping({ fields, rows, fileName: file.name });
      setMapSel(sel);
      profileDataset(rows, fields, file.name);
      await saveRows(payload, tr(t.okAuto, { ROWS: payload.length, N: fields.length, M: matched }));
    } catch (err) {
      const msg = err.message === "BINARY" ? t.errBinary : tr(t.errParse, { MSG: err.message });
      notify("error", t.errTitle, msg);
    } finally {
      setBusyUpload(false);
    }
  }

  async function saveRows(payload, okText) {
    setBusyUpload(true);
    try {
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from("orders").insert(payload.slice(i, i + 500));
        if (error) {
          const raw = String(error.message || "");
          const isDateErr = /time zone displacement|invalid input syntax|field value out of range/i.test(raw);
          notify("error", t.errTitle, isDateErr ? t.errDbDate : tr(t.errDb, { MSG: raw }));
          return;
        }
      }
      await loadOrders(user.id);
      setNotice(null);
      notify("success", t.okTitle, okText || tr(t.okUpload, { ROWS: payload.length }));
    } finally {
      setBusyUpload(false);
    }
  }

  async function confirmMapping() {
    if (!mapping || !user) return;
    if (!mapSel.Revenue_NZD) { notify("error", t.errTitle, t.mapMissing); return; }
    const payload = buildPayload(mapping.rows, mapSel, mapping.fileName || "data");
    if (!payload.length) { notify("error", t.errTitle, t.errEmpty); return; }
    await saveRows(payload, tr(t.okUpload, { ROWS: payload.length }));
  }

  async function genReport() {
    setBusyAI(true); setReport("");
    try {
      const summary = {
        period: range, currency: "NZD",
        totals: { revenue: +rev.toFixed(2), profit: +prof.toFixed(2), margin_pct: pct(prof, rev), orders: ord, units, customers: agg.meta.customers },
        monthly: agg.monthly.map((m) => ({ month: m[0], revenue: m[1], profit: m[2] })),
        category: agg.category.map((c) => ({ name: c[0], revenue: c[1], profit: c[2], margin_pct: pct(c[2], c[1]) })),
        region: agg.region.map((r) => ({ name: r[0], revenue: r[1], profit: r[2] })),
        channel: agg.channel.map((c) => ({ name: c[0], revenue: c[1] })),
        top_products: agg.top.map((p) => ({ name: p[0], revenue: p[1], profit: p[2] })),
      };
      const resp = await fetch("/api/report", { method: "POST", headers: await aiHeaders(), body: JSON.stringify({ summary, lang }) });
      const j = await resp.json();
      setReport(j.error ? tr(t.errAI, { MSG: j.error }) : j.report);
      setReportLang(j.error ? "" : lang);
    } catch (err) {
      setReport(tr(t.errAI, { MSG: err.message }));
      setReportLang("");
    } finally { setBusyAI(false); }
  }

  async function translateReport() {
    if (!report || busyTranslate) return;
    setBusyTranslate(true);
    try {
      const resp = await fetch("/api/translate", {
        method: "POST", headers: await aiHeaders(),
        body: JSON.stringify({ text: report, targetLang: lang, kind: "report" }),
      });
      const j = await resp.json();
      if (j.error || !j.data?.text) {
        notify("error", t.reportTitle, tr(t.errTranslate, { MSG: j.error || "empty response" }));
        return;
      }
      setReport(j.data.text);
      setReportLang(lang);
    } catch (err) {
      notify("error", t.reportTitle, tr(t.errTranslate, { MSG: err.message }));
    } finally { setBusyTranslate(false); }
  }

  function exportReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "business_report_" + new Date().toISOString().slice(0, 10) + ".txt";
    a.click();
  }

  async function logout() {
    if (supabaseConfigured) await supabase.auth.signOut();
    router.replace("/");
  }

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const nav = (id) => id === "sec-top" ? window.scrollTo({ top: 0, behavior: "smooth" }) : go(id);
  const pick = (zh, en) => (lang === "en" ? en : zh);
  const cht = {
    monthly: smart ? pick(smart.labels.trend, smart.labels.trendEn) : t.chMonthly,
    cat: smart ? pick(smart.labels.cat, smart.labels.catEn) : t.chCat,
    region: smart ? pick(smart.labels.region, smart.labels.regionEn) : t.chRegion,
    margin: smart ? pick(smart.labels.margin, smart.labels.marginEn) : t.chMargin,
    channel: smart ? pick(smart.labels.channel, smart.labels.channelEn) : t.chChannel,
    top: smart ? pick(smart.labels.top, smart.labels.topEn) : t.chTop,
  };
  const sub = (orig) => (smart ? smart.primary || "" : orig);

  if (!ready) {
    return (
      <div className="app-shell" translate="no">
        <aside className="sidebar">
          <div className="side-brand"><div className="logo-dot"></div><div><b>{t.brand}</b><small>{t.brandSub}</small></div></div>
          <div className="skel-line"></div><div className="skel-line short"></div><div className="skel-line"></div>
        </aside>
        <main className="main-area">
          <div className="topbar"><div className="skel-line short"></div></div>
          <div className="sub">{t.loading}</div>
          <div className="kpis">{[1,2,3,4].map((i) => <div className="kpi skeleton" key={i}></div>)}</div>
          <div className="cards"><div className="card skeleton tall"></div><div className="card skeleton tall"></div></div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell" translate="no">
      <aside className="sidebar">
        <div className="side-brand"><div className="logo-dot"></div><div><b>{t.brand}</b><small>{t.brandSub}</small></div></div>
        <div className="nav-group">{t.groupData}</div>
        <div className="nav-item active" onClick={() => nav("sec-top")}>◼ {t.navOverview}</div>
        <div className="nav-item" onClick={() => nav("sec-churn")}>◈ {t.churnNav}</div>
        <div className="nav-item" onClick={() => nav("sec-report")}>✦ {t.navReport}</div>
        <div className="nav-group">{t.groupWorkspace}</div>
        <div className="nav-item" onClick={() => nav("sec-upload")}>↥ {t.navUpload}</div>
        <div className="side-foot">
          <div className="avatar">{(user?.email || "D")[0].toUpperCase()}</div>
          <div className="side-user"><span>{user?.email || t.demoMode}</span><small>{supabaseConfigured ? t.sourceAccount : t.demoMode}</small></div>
        </div>
      </aside>

      <main className="main-area">
        <div className="topbar">
          <div className="crumb">{t.breadcrumb}</div>
          <div className="topbar-right">
            {notice && <span className={"pill " + notice.kind}>{notice.kind === "success" ? "✓" : "!"}</span>}
            <div className="lang-switch">
              <span className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")}>中文</span>
              <span className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</span>
            </div>
            <button className="btn btn-ghost small" onClick={logout}>{t.logout}</button>
          </div>
        </div>

        <header className="page-head" id="sec-top">
          <div><h1>{t.pageTitle}</h1><p>{t.pageDesc}</p></div>
          <div className="filter-bar">
            <span className="filter-label">{t.fLabel}</span>
            <div className="seg">
              {[["all", t.fAll], ["12m", t.f12m], ["6m", t.f6m], ["3m", t.f3m]].map(([k, label]) => (
                <span key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{label}</span>
              ))}
            </div>
            <span className="data-src">{t.dataSource}: {supabaseConfigured && user ? t.sourceAccount : t.sourceSample} · {agg.meta.rows} {t.rows}</span>
          </div>
        </header>

        {!supabaseConfigured && <div className="setup-banner">{t.demoBanner}</div>}

        {notice && (
          <div className={"alert " + notice.kind}>
            <div className="alert-icon">{notice.kind === "success" ? "✓" : "!"}</div>
            <div className="alert-body">
              <b>{notice.title}</b>
              <div>{notice.text}</div>
              {notice.detail && <small>{notice.detail}</small>}
              {(notice.template || notice.canMap) && (
                <div className="alert-actions">
                  {notice.canMap && <button className="btn btn-primary small" onClick={() => go("sec-mapping")}>⤳ {t.mapBtn}</button>}
                  {notice.template && <button className="btn btn-ghost small" onClick={downloadTemplate}>↓ {t.templateBtn}</button>}
                </div>
              )}
            </div>
            <button className="alert-close" title={t.dismiss} onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        {mapping && (
          <div className="card mapping-panel" id="sec-mapping">
            <div className="card-head"><h3>{t.mapTitle}</h3><span>{mapping.fields.length} cols</span></div>
            <p className="map-desc">{t.mapDesc}</p>
            <div className="map-grid">
              {REQUIRED.map((std) => (
                <label key={std}>
                  <span>{std}</span>
                  <select value={mapSel[std] || ""} onChange={(e) => setMapSel((m) => ({ ...m, [std]: e.target.value }))}>
                    <option value="">{t.mapNone}</option>
                    {mapping.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <small className="map-note">{t.mapNote}</small>
            <div className="map-actions">
              <button className="btn btn-primary" onClick={confirmMapping} disabled={busyUpload}>{busyUpload ? t.generating : t.mapConfirm}</button>
              <button className="btn btn-ghost" onClick={() => setMapping(null)}>{t.mapCancel}</button>
            </div>
          </div>
        )}

        {profileBusy && <div className="ai-thinking">{t.aiThinking}</div>}

        {smart && (
          <div className="profile-card">
            <div className="profile-top">
              <div>
                <div className="profile-tag">✦ {t.profileTag}</div>
                <h3>{pick(smart.profile.title_zh, smart.profile.title_en)}</h3>
                <p>{pick(smart.profile.summary_zh, smart.profile.summary_en)}</p>
              </div>
              <button className="btn btn-ghost small" onClick={clearDataset}>{t.restoreSample}</button>
            </div>
            <div className="profile-meta">
              <span>{t.profileTime}: <b>{smart.timeCol || "—"}</b></span>
              <span>{t.profileDims}: <b>{smart.dims.join(", ") || "—"}</b></span>
              <span>{t.profileMetrics}: <b>{smart.metrics.map((m) => pick(m.label_zh, m.label_en)).join(", ") || "—"}</b></span>
            </div>
            <div className="profile-suggest">
              <b>{t.profileAnalysis}</b>
              <ul>{(pick(smart.profile.suggestions_zh, smart.profile.suggestions_en) || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              <small>{t.profileCaveat}: {pick(smart.profile.caveats_zh, smart.profile.caveats_en)}</small>
            </div>
          </div>
        )}

        <div className="kpis">
          {smart ? smart.kpis.map((k, i) => (
            <div className="kpi" key={i}>
              <div className="label">{pick(k.label_zh, k.label_en)}</div>
              <div className="value money">{k.unit === "NZD" ? fmt(k.value) : k.value.toLocaleString("en-NZ", { maximumFractionDigits: 1 })}</div>
              <div className="delta">{smart.profile.domain} · {agg.meta.rows} {t.rows}</div>
            </div>
          )) : (
            <>
              <div className="kpi"><div className="label">{t.rev}</div><div className="value money">{fmt(rev)}</div><div className="delta">{t.kpiRevSub}</div></div>
              <div className="kpi"><div className="label">{t.prof}</div><div className="value money">{fmt(prof)}</div><div className="delta">{tr(t.kpiProfSub, { V: pct(prof, rev) })}</div></div>
              <div className="kpi"><div className="label">{t.orders}</div><div className="value">{ord}</div><div className="delta">{tr(t.kpiOrdersSub, { V: agg.meta.customers })}</div></div>
              <div className="kpi"><div className="label">{t.units}</div><div className="value">{units}</div><div className="delta">{tr(t.kpiUnitsSub, { A: agg.category.length, B: agg.region.length })}</div></div>
            </>
          )}
        </div>

        <ChurnPanel rawRows={rawRows} lang={lang} t={t} />

        <div className="cards">
          <div className="card"><div className="card-head"><h3>{cht.monthly}</h3><span>{sub(t.chMonthlySub)}</span></div><div className="chart-box"><canvas id="chMonthly"></canvas></div></div>
          <div className="card"><div className="card-head"><h3>{cht.cat}</h3><span>{sub(t.chCatSub)}</span></div><div className="chart-box"><canvas id="chCategory"></canvas></div></div>
        </div>
        <div className="cards-even">
          <div className="card"><div className="card-head"><h3>{cht.region}</h3><span>{sub(t.chRegionSub)}</span></div><div className="chart-box"><canvas id="chRegion"></canvas></div></div>
          <div className="card"><div className="card-head"><h3>{cht.margin}</h3><span>{sub(t.chMarginSub)}</span></div><div className="chart-box"><canvas id="chMargin"></canvas></div></div>
        </div>
        <div className="cards">
          <div className="card"><div className="card-head"><h3>{cht.channel}</h3><span>{sub(t.chChannelSub)}</span></div><div className="chart-box"><canvas id="chChannel"></canvas></div></div>
          <div className="card">
            <div className="card-head"><h3>{cht.top}</h3><span>{sub(t.chTopSub)}</span></div>
            <table>
              <thead><tr><th>{t.tblProduct}</th><th className="num">{t.tblRevenue}</th>{!smart && <th className="num">{t.tblProfit}</th>}</tr></thead>
              <tbody>
                {agg.top.map((p) => (
                  <tr key={p[0]}>
                    <td>{p[0]}<div className="bar"><i style={{ width: (p[1] / maxTop * 100) + "%" }}></i></div></td>
                    <td className="num money">{smart ? p[1].toLocaleString("en-NZ") : fmt(p[1])}</td>
                    {!smart && <td className="num money" style={{ color: "var(--green)" }}>{fmt(p[2])}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="section" id="sec-upload">
          <div className="section-head"><h2>{t.uploadTitle}</h2><p>{t.uploadDesc}</p></div>
          <div className={"dropzone" + (busyUpload ? " busy" : "")}
            onClick={() => document.getElementById("fileInput")?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); handleFile(e.dataTransfer.files[0]); }}>
            <div className="dz-icon">{busyUpload ? "⏳" : "↥"}</div>
            <div className="dz-title">{busyUpload ? tr(t.uploading, { N: "…" }) : t.dz}</div>
            <p>{t.dzHint}</p>
            <p className="dz-format">{t.dzFormat}</p>
            <button className="btn btn-ghost small" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>↓ {t.templateBtn}</button>
          </div>
          <input id="fileInput" type="file" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; handleFile(f); }} />
        </section>

        <section className="section" id="sec-report">
          <div className="section-head"><h2>{t.reportTitle}</h2><p>{t.reportDesc}</p></div>
          <div className="report-actions">
            <button className="btn btn-primary" onClick={genReport} disabled={busyAI}>{busyAI ? t.generating : t.genReport}</button>
            {report && reportLang && reportLang !== lang && (
              <button className="btn btn-ghost" onClick={translateReport} disabled={busyTranslate}>
                {busyTranslate ? t.translating : tr(t.translateBtn, { LANG: lang === "en" ? "English" : "中文" })}
              </button>
            )}
            <button className="btn btn-ghost" onClick={exportReport} disabled={!report}>{t.exportBtn}</button>
          </div>
          {report && reportLang && reportLang !== lang && !busyAI && !busyTranslate && <div className="report-empty">{t.reportLangHint}</div>}
          {!report && !busyAI && <div className="report-empty">{t.reportEmpty}</div>}
          {(report || busyAI) && <div className="ai-report show">{busyAI ? t.generating : report}</div>}
        </section>
      </main>
    </div>
  );
}
