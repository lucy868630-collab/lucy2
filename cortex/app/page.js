"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

const T = {
  zh: {
    sub: "商业工作台 · BI 分析 / 数据落库 / AI 报告 · 新西兰小企业版 v3.0",
    login: "登录", signup: "注册",
    email: "邮箱", pwd: "密码（至少 6 位）",
    btnLogin: "登录", btnSignup: "创建账户",
    okSignup: "✅ 注册成功！请查收邮箱确认邮件后再登录（也可在 Supabase 后台关闭邮箱确认）。",
    errCfg: "⚠️ 尚未配置 Supabase：请在 .env.local 中填入项目 URL 和 Anon Key 后重启服务器（详见 README.md 第 2 步）。",
    invalid: "请填写邮箱，密码至少 6 位",
    mailHint: "收不到确认邮件？Supabase 免费邮件常进垃圾箱或被限流。解决：Dashboard → Authentication → Sign In / Providers → Email → 关闭 Confirm email 后重新注册；或在 Authentication → Users 中找到该邮箱手动确认。",
    googleBtn: "使用 Google 账号登录", orText: "或",
  },
  en: {
    sub: "Business Workbench · BI Analytics / Data / AI Reports · v3.0",
    login: "Sign in", signup: "Sign up",
    email: "Email", pwd: "Password (min 6 chars)",
    btnLogin: "Sign in", btnSignup: "Create account",
    okSignup: "✅ Account created! Check your email for the confirmation link, then sign in.",
    errCfg: "⚠️ Supabase not configured: fill in URL & Anon Key in .env.local and restart (see README.md step 2).",
    invalid: "Enter an email; password must be at least 6 characters",
    mailHint: "No confirmation email? Supabase free-tier emails often land in spam or get throttled. Fix: Dashboard → Authentication → Sign In / Providers → Email → turn off Confirm email and register again; or manually confirm the user under Authentication → Users.",
    googleBtn: "Continue with Google", orText: "or",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState("zh");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const t = T[lang];
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) setMsg({ cls: "err", text: error.message });
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!supabaseConfigured) { setMsg({ cls: "err", text: t.errCfg }); return; }
    if (!email || pwd.length < 6) { setMsg({ cls: "err", text: t.invalid }); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) throw error;
        setMsg({ cls: "ok", text: t.okSignup });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err) {
      setMsg({ cls: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div className="logo" style={{ marginBottom: 0 }}><div className="logo-dot"></div>Cortex</div>
          <div className="lang-switch">
            <span className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")}>中文</span>
            <span className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</span>
          </div>
        </div>
        <div className="sub">{t.sub}</div>

        {!supabaseConfigured && (
          <div className="setup-banner">{t.errCfg}</div>
        )}

        <div className="mode-tabs">
          <span className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>{t.login}</span>
          <span className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>{t.signup}</span>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>{t.email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.nz" />
          </div>
          <div className="field">
            <label>{t.pwd}</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "…" : mode === "login" ? t.btnLogin : t.btnSignup}
          </button>
        </form>

        {googleEnabled && supabaseConfigured && (
          <>
            <div className="hint">{t.orText}</div>
            <button className="btn btn-ghost" style={{ width: "100%" }} onClick={googleLogin}>
              {t.googleBtn}
            </button>
          </>
        )}

        {msg && <div className={"msg " + msg.cls}>{msg.text}</div>}
        <div className="hint" style={{ textAlign: "left", marginTop: 16, background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
          {t.mailHint}
        </div>
        <div className="hint">Cortex v3.0 · Next.js + Supabase · 每位客户数据互相隔离</div>
      </div>
    </div>
  );
}
