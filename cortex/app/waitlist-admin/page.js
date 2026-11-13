"use client";

import { useEffect, useState } from "react";

const COPY = {
  zh: {
    title: "Relaywork 候补名单",
    sub: "内部工具 · 凭证只保存在当前标签页，不写入 localStorage",
    tokenLabel: "管理凭证",
    load: "加载名单",
    exporting: "导出 CSV",
    loading: "读取中…",
    needToken: "请先填写管理凭证。",
    network: "网络错误，请稍后重试。",
    failed: "读取失败：",
    loaded: "已读取",
    unit: "条",
    empty: "暂无数据。如果刚执行完建表脚本，这是正常的。",
    hint: "未配置凭证时接口会拒绝访问；名单也可以直接在 Supabase 控制台查看。",
    langBtn: "EN",
    cols: ["邮箱", "公司", "角色", "备注", "来源", "提交时间"],
  },
  en: {
    title: "Relaywork waitlist",
    sub: "Internal tool · the token stays in this tab only, never in localStorage",
    tokenLabel: "Admin token",
    load: "Load list",
    exporting: "Export CSV",
    loading: "Loading…",
    needToken: "Enter the admin token first.",
    network: "Network error, please retry.",
    failed: "Could not load: ",
    loaded: "Loaded",
    unit: "rows",
    empty: "No rows yet. This is expected right after running the schema script.",
    hint: "The API refuses access when credentials are unset; you can also view the list in the Supabase console.",
    langBtn: "中",
    cols: ["Email", "Company", "Role", "Note", "Source", "Created at"],
  },
};

const s = {
  page: { minHeight: "100vh", background: "#070B18", color: "#E2E8F0", padding: "32px 16px", fontFamily: "system-ui, sans-serif" },
  card: { maxWidth: 1080, margin: "0 auto", background: "#111827", border: "1px solid #1F2937", borderRadius: 16, padding: 28 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  sub: { fontSize: 13, color: "#94A3B8", margin: "8px 0 0" },
  hint: { fontSize: 12, color: "#64748B", margin: "14px 0 0", lineHeight: 1.6 },
  msg: { fontSize: 13, color: "#A5B4FC", margin: "14px 0 0" },
  input: { flex: "1 1 260px", minWidth: 200, padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0B1220", color: "#E2E8F0", fontSize: 14 },
  primary: { padding: "10px 18px", borderRadius: 10, border: "none", background: "#6366F1", color: "#fff", fontWeight: 600, cursor: "pointer" },
  ghost: { padding: "10px 16px", borderRadius: 10, border: "1px solid #334155", background: "transparent", color: "#CBD5E1", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 16 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #334155", color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap" },
  td: { padding: "10px 8px", borderBottom: "1px solid #1F2937", verticalAlign: "top", wordBreak: "break-word" },
};

const COLS = ["email", "company", "role", "note", "source", "created_at"];

export default function WaitlistAdminPage() {
  const [lang, setLang] = useState("zh");
  const [token, setToken] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const t = COPY[lang];

  useEffect(() => {
    setToken(sessionStorage.getItem("relaywork-admin-token") || "");
  }, []);

  async function load() {
    const value = token.trim();
    if (!value) {
      setMsg(t.needToken);
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/waitlist/admin?limit=200", {
        headers: { Authorization: "Bearer " + value },
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRows(null);
        setMsg(t.failed + (body?.detail || body?.errors?.detail || res.status));
        return;
      }
      sessionStorage.setItem("relaywork-admin-token", value);
      setRows(Array.isArray(body.data?.rows) ? body.data.rows : []);
      setMsg(`${t.loaded} ${body.data?.count ?? 0} ${t.unit}`);
    } catch {
      setMsg(t.network);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!rows?.length) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "relaywork-waitlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={s.h1}>{t.title}</h1>
          <button type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} style={s.ghost}>{t.langBtn}</button>
        </div>
        <p style={s.sub}>{t.sub}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="WAITLIST_ADMIN_TOKEN"
            aria-label={t.tokenLabel}
            style={s.input}
          />
          <button type="button" onClick={load} disabled={busy} style={s.primary}>{busy ? t.loading : t.load}</button>
          <button type="button" onClick={exportCsv} disabled={!rows?.length} style={s.ghost}>{t.exporting}</button>
        </div>

        {msg && <p style={s.msg}>{msg}</p>}
        <p style={s.hint}>{t.hint}</p>

        {rows?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>{t.cols.map((c) => <th key={c} style={s.th}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id ?? r.email}>
                    {COLS.map((c) => <td key={c} style={s.td}>{r[c] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows && !rows.length ? <p style={s.hint}>{t.empty}</p> : null}
      </div>
    </main>
  );
}
