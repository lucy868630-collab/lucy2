import { config } from "../../../../src/shared/config.js";
import { handle, json } from "../../../../src/shared/http.js";

export const dynamic = "force-dynamic";

const projectRef = (url) => {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
};

/**
 * 只读自检：确认 public.waitlist 是否真的存在于应用当前连接的 Supabase 项目。
 * 不发写请求、不返回名单内容、不返回任何密钥；/api/ready 只检查配置，这里检查表。
 */
export const GET = handle(async (req, { requestId, log }) => {
  const base = {
    request_id: requestId,
    project_ref: projectRef(config.supabase.url),
    schema_file: "cortex/waitlist_schema.sql",
  };

  if (!config.supabase.configured) {
    return json({
      ...base,
      status: "unconfigured",
      ready: false,
      table: "unknown",
      hint: "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 未配置，站点处于演示模式。",
    });
  }

  const endpoint = config.supabase.url.replace(/\/$/, "") + "/rest/v1/waitlist?select=id&limit=1";
  let res;
  let text = "";
  try {
    res = await fetch(endpoint, {
      headers: {
        apikey: config.supabase.anonKey,
        Authorization: "Bearer " + config.supabase.anonKey,
      },
      cache: "no-store",
    });
    text = (await res.text().catch(() => "")).slice(0, 300);
  } catch (err) {
    log.info("waitlist.status_unreachable", { message: String(err?.message) });
    return json({
      ...base,
      status: "unreachable",
      ready: false,
      table: "unknown",
      hint: "无法连接 Supabase REST，检查网络或项目是否暂停。",
    });
  }

  if (res.ok) {
    let rows = null;
    try {
      rows = JSON.parse(text);
    } catch {
      rows = null;
    }
    const visible = Array.isArray(rows) ? rows.length : null;
    const insecure = visible !== null && visible > 0;
    return json({
      ...base,
      status: insecure ? "insecure" : "ok",
      ready: !insecure,
      table: "present",
      anon_visible_rows: visible,
      hint: insecure
        ? "anon 能读到名单内容，RLS 策略有误，请重新执行 waitlist_schema.sql。"
        : "public.waitlist 已就绪，/api/waitlist 可以正常写入。",
    });
  }

  if (text.includes("PGRST205")) {
    return json({
      ...base,
      status: "table_missing",
      ready: false,
      table: "missing",
      hint: "public.waitlist 不存在。请在本响应 project_ref 所指项目的 SQL Editor 执行 waitlist_schema.sql；若已在别的项目跑过，需切换项目重跑。",
    });
  }

  if (res.status === 401 || res.status === 403) {
    return json({
      ...base,
      status: "key_mismatch",
      ready: false,
      table: "unknown",
      hint: "anon key 与 Project URL 不属于同一个 Supabase 项目，请在 Vercel / .env.local 中成对替换后重新部署。",
    });
  }

  return json({
    ...base,
    status: "unknown",
    ready: false,
    table: "unknown",
    upstream_status: res.status,
    hint: text.slice(0, 160),
  });
});
