import { rateLimit } from "../../../src/shared/auth.js";
import { config } from "../../../src/shared/config.js";
import { UpstreamError, ValidationError } from "../../../src/shared/errors.js";
import { handle, json } from "../../../src/shared/http.js";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

/** 公开的 waitlist 提交：限流 + 邮箱校验 + 匿名写入（名单不可被匿名读取）。 */
export const POST = handle(async (req, { requestId, log }) => {
  rateLimit(req);

  let body;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("请求体必须是 JSON", [{ field: "body", message: "invalid JSON" }]);
  }

  const email = clean(body?.email, 254).toLowerCase();
  if (!EMAIL.test(email)) {
    throw new ValidationError("请填写有效的邮箱地址", [{ field: "email", message: "invalid email" }]);
  }
  if (!config.supabase.configured) {
    throw new UpstreamError("Waitlist 后端尚未配置", { detail: "Supabase env vars missing" });
  }

  const endpoint = config.supabase.url.replace(/\/$/, "") + "/rest/v1/waitlist";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabase.anonKey,
      Authorization: "Bearer " + config.supabase.anonKey,
      Prefer: "return=minimal, resolution=ignore-duplicates",
    },
    body: JSON.stringify({
      email,
      company: clean(body?.company, 120) || null,
      role: clean(body?.role, 120) || null,
      note: clean(body?.note, 1000) || null,
      source: clean(body?.source, 60) || "relaywork-landing",
    }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    if (detail.includes("PGRST205")) {
      throw new UpstreamError("候补名单表未就绪", {
        detail: "Supabase 返回 PGRST205：public.waitlist 不存在。请在应用所连接的 Supabase 项目（与 NEXT_PUBLIC_SUPABASE_URL 同一个）的 SQL Editor 执行 waitlist_schema.sql；若在另一个项目里跑过，需切换项目重跑。",
      });
    }
    throw new UpstreamError("提交失败（" + res.status + "）", { detail });
  }

  // 只记录邮箱域名，不把完整地址写进日志
  log.info("waitlist.signup", { domain: email.split("@")[1], request_id: requestId });
  return json({ data: { ok: true } }, { requestId });
});
