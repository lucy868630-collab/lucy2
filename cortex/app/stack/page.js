"use client";

import { useEffect, useState } from "react";

const LAYERS = [
  {
    key: "frontend",
    title: "FRONTEND",
    accent: "#22d3ee",
    items: ["React 19", "Next.js 15", "TailwindCSS", "TypeScript"],
  },
  {
    key: "backend",
    title: "BACKEND",
    accent: "#4ade80",
    items: ["Node.js 22 Route Handlers", "Express Gateway", "FastAPI (Python)", "三层分层架构"],
  },
  {
    key: "postgres",
    title: "DATABASE",
    accent: "#a3e635",
    items: ["PostgreSQL / Supabase", "MongoDB（可选）", "Redis 缓存", "RLS 行级隔离"],
  },
  {
    key: "ai",
    title: "AI & ML LAYER",
    accent: "#c084fc",
    items: ["OpenAI / DeepSeek API", "链式编排（可换 LangChain）", "向量检索 + Embeddings", "Hugging Face 模型"],
  },
  {
    key: "devops",
    title: "DEVOPS & DEPLOYMENT",
    accent: "#38bdf8",
    items: ["Docker + Compose", "Kubernetes manifests", "GitHub Actions", "Vercel / AWS Lambda"],
  },
  {
    key: "auth",
    title: "AUTH & SECURITY",
    accent: "#818cf8",
    items: ["JWT（Supabase Auth）", "OAuth 2.0（Google）", "Bearer 鉴权 + 限流", "输入校验 / 脱敏日志"],
  },
];

const EXTRA_CHECKS = ["redis", "mongodb", "vector", "postgres", "ai", "auth"];

function statusOf(checks, key) {
  const c = checks?.[key];
  if (!c) return { label: "检查中", color: "#94a3b8" };
  if (c.status === "ok") return { label: "已就绪", color: "#4ade80" };
  if (c.status === "fallback") return { label: "降级运行", color: "#fbbf24" };
  if (c.status === "unconfigured") return { label: "未配置（可选）", color: "#94a3b8" };
  return { label: c.status, color: "#fbbf24" };
}

export default function StackPage() {
  const [ready, setReady] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/ready", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("ready probe returned " + r.status);
        return r.json();
      })
      .then((data) => { if (alive) setReady(data); })
      .catch((e) => { if (alive) setError(e.message || "无法读取服务状态"); });
    return () => { alive = false; };
  }, []);

  return (
    <main className="tw-min-h-screen tw-bg-[#05070f] tw-text-slate-200 tw-px-5 tw-py-10 tw-font-sans">
      <div className="tw-max-w-6xl tw-mx-auto">
        <header className="tw-mb-9">
          <p className="tw-text-xs tw-tracking-[0.32em] tw-text-cyan-400/80 tw-mb-3">CORTEX · ARCHITECTURE</p>
          <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-tracking-tight tw-mb-3"
              style={{ color: "#67e8f9" }}>
            Modern Full-Stack AI Tech Stack
          </h1>
          <p className="tw-text-sm tw-text-slate-400 tw-max-w-2xl tw-leading-relaxed">
            六层架构已按技术栈图落地到现有工作台。状态来自 <code className="tw-text-cyan-300">/api/ready</code> 的实时探针，
            可选组件未配置时会自动降级，不影响主站运行。
          </p>
          <div className="tw-mt-4 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
            <span className="tw-text-xs tw-px-3 tw-py-1.5 tw-rounded-full"
                  style={{ background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.35)", color: "#67e8f9" }}>
              {error ? "探针异常" : ready ? (ready.degraded ? "核心就绪 · 可选降级" : "全部就绪") : "正在检测…"}
            </span>
            <a href="/dashboard" className="tw-text-xs tw-text-slate-400 hover:tw-text-cyan-300 tw-underline">
              返回工作台 →
            </a>
          </div>
        </header>

        {error && (
          <div className="tw-mb-6 tw-rounded-xl tw-px-4 tw-py-3 tw-text-sm"
               style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.35)", color: "#fca5a5" }}>
            无法读取服务状态：{error}
          </div>
        )}

        <div className="tw-grid tw-gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
          {LAYERS.map((layer) => {
            const s = statusOf(ready?.checks, layer.key);
            return (
              <section key={layer.key}
                       className="tw-rounded-2xl tw-p-5 tw-transition tw-duration-200 hover:tw--translate-y-1"
                       style={{ background: "rgba(15,23,42,.72)", border: `1px solid ${layer.accent}55` }}>
                <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-mb-4">
                  <h2 className="tw-text-xs tw-font-bold tw-tracking-[0.16em]"
                      style={{ color: layer.accent }}>{layer.title}</h2>
                  <span className="tw-text-[11px] tw-px-2 tw-py-1 tw-rounded-full tw-whitespace-nowrap"
                        style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}44` }}>
                    {s.label}
                  </span>
                </div>
                <ul className="tw-space-y-2.5 tw-list-none tw-m-0 tw-p-0">
                  {layer.items.map((item) => (
                    <li key={item} className="tw-flex tw-items-start tw-gap-2.5 tw-text-[13px] tw-text-slate-300">
                      <span className="tw-mt-[7px] tw-w-1.5 tw-h-1.5 tw-rounded-full tw-shrink-0"
                            style={{ background: layer.accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="tw-mt-8 tw-rounded-2xl tw-p-6"
                 style={{ background: "rgba(15,23,42,.72)", border: "1px solid rgba(148,163,184,.18)" }}>
          <h3 className="tw-text-sm tw-font-semibold tw-text-slate-200 tw-mb-4">新增可调用接口</h3>
          <div className="tw-grid tw-gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {[
              ["GET", "/api/health", "存活探针"],
              ["GET", "/api/ready", "六层就绪状态"],
              ["GET", "/api/insights", "业务 JSON API（JWT + 缓存）"],
              ["POST", "/api/insights", "即时聚合（输入校验）"],
              ["POST", "/api/ai/chain", "模型链式编排"],
              ["GET", "/api/vector", "向量库状态"],
            ].map(([method, path, desc]) => (
              <div key={path} className="tw-rounded-lg tw-px-3 tw-py-2.5"
                   style={{ background: "rgba(2,6,23,.6)", border: "1px solid rgba(148,163,184,.14)" }}>
                <div className="tw-flex tw-items-center tw-gap-2 tw-mb-1">
                  <span className="tw-text-[10px] tw-font-bold tw-px-1.5 tw-py-0.5 tw-rounded"
                        style={{ background: method === "GET" ? "rgba(74,222,128,.15)" : "rgba(192,132,252,.15)",
                                 color: method === "GET" ? "#86efac" : "#d8b4fe" }}>{method}</span>
                  <code className="tw-text-xs tw-text-cyan-300">{path}</code>
                </div>
                <p className="tw-text-[11px] tw-text-slate-500 tw-m-0">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="tw-mt-5 tw-rounded-2xl tw-p-6"
                 style={{ background: "rgba(15,23,42,.72)", border: "1px solid rgba(148,163,184,.18)" }}>
          <h3 className="tw-text-sm tw-font-semibold tw-text-slate-200 tw-mb-3">组件实时状态</h3>
          {!ready && !error && (
            <div className="tw-h-4 tw-w-2/3 tw-rounded tw-animate-pulse" style={{ background: "rgba(148,163,184,.15)" }} />
          )}
          {ready && (
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {EXTRA_CHECKS.map((k) => {
                const s = statusOf(ready.checks, k);
                return (
                  <span key={k} className="tw-text-[11px] tw-px-2.5 tw-py-1.5 tw-rounded-lg"
                        style={{ background: "rgba(2,6,23,.6)", border: `1px solid ${s.color}44`, color: s.color }}>
                    {k} · {s.label}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        <footer className="tw-mt-8 tw-text-center tw-text-[11px] tw-text-slate-600">
          Cortex v3.1 · 增量架构升级，原有登录 / 上传 / AI 报告保持不变
        </footer>
      </div>
    </main>
  );
}
