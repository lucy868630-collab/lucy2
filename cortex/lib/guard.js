import { createClient } from "@supabase/supabase-js";

// 基础安全网关：同源 / 令牌校验 + 限流 + 请求体上限。
// 目标：公开部署后，AI 接口不能被站外脚本无限调用而烧掉 API 额度。
const MAX_BODY_BYTES = 128 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 12;

const hits = new Map();

function supabaseReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (String(url).includes("请替换") || String(key).includes("请替换")) return false;
  return true;
}

function sameOrigin(req) {
  const raw = req.headers.get("origin") || req.headers.get("referer");
  if (!raw) return false;
  let host;
  try {
    host = new URL(raw).host.toLowerCase();
  } catch {
    return false;
  }
  const expected = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0].trim().toLowerCase();
  return Boolean(expected) && host === expected;
}

// 移动端 App 没有 Origin 头，靠 Supabase access token 认证
async function validToken(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
  if (!token || !supabaseReady()) return false;
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await sb.auth.getUser(token);
    return !error && Boolean(data?.user);
  } catch {
    return false;
  }
}

function tooMany(req) {
  const now = Date.now();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "local";
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
    }
  }
  return false;
}

const deny = (status, error) => Response.json({ error }, { status });

/**
 * @returns {{ok:true, body:object}|{ok:false, response:Response}}
 */
export async function guard(req) {
  const tokenOK = await validToken(req);
  // 已配置 Supabase：必须携带有效 token（网页与 App 都走这条）
  // 未配置（演示模式）：没有 token，至少要求从本站同源发起
  if (!tokenOK && (supabaseReady() || !sameOrigin(req))) {
    return {
      ok: false,
      response: deny(401, "未授权：请先登录，或从本站页面发起请求"),
    };
  }
  if (tooMany(req)) {
    return { ok: false, response: deny(429, "请求过于频繁，请一分钟后再试") };
  }

  let raw;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, response: deny(400, "请求体读取失败") };
  }
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: deny(413, "请求体过大（上限 128KB）") };
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, response: deny(400, "请求体不是有效 JSON") };
  }
  return { ok: true, body };
}
