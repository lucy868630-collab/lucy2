import { timingSafeEqual } from "node:crypto";

import { rateLimit } from "../../../../src/shared/auth.js";
import { config } from "../../../../src/shared/config.js";
import { UnauthorizedError, UpstreamError } from "../../../../src/shared/errors.js";
import { handle, json } from "../../../../src/shared/http.js";

export const dynamic = "force-dynamic";

function sameToken(a, b) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * 受保护的名单读取。两项配置缺一即拒绝访问，绝不回退到匿名读取。
 * 日志只记录行数，不记录邮箱内容。
 */
export const GET = handle(async (req, { requestId, log }) => {
  rateLimit(req);

  if (!config.admin.token) {
    throw new UpstreamError("名单后台未配置：请设置 WAITLIST_ADMIN_TOKEN，或直接在 Supabase 控制台查看名单");
  }
  const raw = req.headers.get("authorization") || "";
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : "";
  if (!token || !sameToken(token, config.admin.token)) {
    throw new UnauthorizedError("管理凭证无效");
  }
  if (!config.admin.serviceKey || !config.supabase.configured) {
    throw new UpstreamError("名单读取未配置：请设置 SUPABASE_SERVICE_ROLE_KEY，或直接在 Supabase 控制台查看名单");
  }

  const url = new URL(req.url);
  const asked = Number.parseInt(url.searchParams.get("limit") || "100", 10);
  const limit = Math.min(config.admin.maxRows, Math.max(1, Number.isFinite(asked) ? asked : 100));
  const endpoint = config.supabase.url.replace(/\/$/, "") +
    `/rest/v1/waitlist?select=id,email,company,role,note,source,created_at&order=created_at.desc&limit=${limit}`;

  let res;
  let body = "";
  try {
    res = await fetch(endpoint, {
      headers: {
        apikey: config.admin.serviceKey,
        Authorization: "Bearer " + config.admin.serviceKey,
      },
      cache: "no-store",
    });
    body = (await res.text().catch(() => "")).slice(0, 20000);
  } catch (err) {
    log.info("waitlist.admin_unreachable", { message: String(err?.message) });
    throw new UpstreamError("无法连接 Supabase REST");
  }

  if (!res.ok) {
    if (body.includes("PGRST205")) {
      throw new UpstreamError("候补名单表未就绪：请在正确项目执行 waitlist_schema.sql");
    }
    throw new UpstreamError("读取名单失败（" + res.status + "）", { detail: body.slice(0, 160) });
  }

  let rows = [];
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) rows = parsed;
  } catch {
    rows = [];
  }
  log.info("waitlist.admin_read", { rows: rows.length, request_id: requestId });
  return json({ data: { rows, count: rows.length, limit } }, { requestId });
});
