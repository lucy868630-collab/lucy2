import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { RateLimitError, UnauthorizedError } from "./errors.js";

// 与既有 lib/guard.js 一致的窗口策略；GET 请求无法走 guard 的 body 解析，故在此单独校验。
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map();

function clientKey(req) {
  return (
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(req) {
  const now = Date.now();
  const key = clientKey(req);
  const list = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(key, list);
    throw new RateLimitError();
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
    }
  }
}

/** JWT Bearer 校验（Supabase Auth 签发），返回 userId 与原始 token 供 RLS 使用。 */
export async function requireUser(req) {
  rateLimit(req);
  const raw = req.headers.get("authorization") || "";
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : "";
  if (!token || !config.supabase.configured) throw new UnauthorizedError();
  const sb = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new UnauthorizedError();
  return { userId: data.user.id, token };
}
