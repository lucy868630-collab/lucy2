import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];

test("落地页分享图指向真实存在的 PNG 资源", () => {
  const html = read("public/relaywork.html");
  for (const name of ["relaywork-og.png", "relaywork-og-zh.png"]) {
    const file = join(root, "public", name);
    assert.ok(existsSync(file), `${name} 不存在`);
    const bytes = readFileSync(file);
    assert.deepEqual([...bytes.subarray(0, 8)], PNG_MAGIC, `${name} 不是有效 PNG`);
    assert.ok(html.includes(name), `落地页未引用 ${name}`);
  }
  assert.ok(!html.includes("relaywork-og-zh.svg"), "中文 OG 仍指向 SVG");
  assert.ok(!html.includes("relaywork-og.svg"), "英文 OG 仍指向 SVG");
  assert.ok(html.includes('property="og:image:type"'), "缺少 og:image:type");
});

test("waitlist 表缺失时给出可操作提示", () => {
  const src = read("app/api/waitlist/route.js");
  assert.ok(src.includes("PGRST205"));
  assert.ok(src.includes("waitlist_schema.sql"));
});

test("waitlist 自检端点只读且能区分表缺失与项目错配", () => {
  const src = read("app/api/waitlist/status/route.js");
  assert.ok(src.includes("select=id&limit=1"), "自检必须只读且不取名单内容");
  assert.ok(src.includes("PGRST205"));
  assert.ok(src.includes("key_mismatch"));
  assert.ok(src.includes("project_ref"));
  assert.ok(!src.includes("method: \"POST\""), "自检不允许写库");
});

test("集中配置包含可选的邮件与后台配置", () => {
  const src = read("src/shared/config.js");
  assert.ok(src.includes("RESEND_API_KEY"));
  assert.ok(src.includes("WAITLIST_ADMIN_TOKEN"));
  assert.ok(src.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!src.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), "service_role 绝不能进浏览器");
});

test("邮件通知未配置时降级，且不把邮箱写进日志", () => {
  const src = read("src/shared/notify.js");
  assert.ok(src.includes('return "skipped"'));
  assert.ok(src.includes("AbortSignal.timeout"));
  assert.ok(!src.includes('"waitlist.mail_sent", { email'), "日志不得记录完整邮箱");
});

test("名单后台凭证缺失时拒绝访问且使用服务端密钥", () => {
  const src = read("app/api/waitlist/admin/route.js");
  assert.ok(src.includes("timingSafeEqual"));
  assert.ok(src.includes("WAITLIST_ADMIN_TOKEN"));
  assert.ok(src.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(src.includes("rateLimit(req)"), "管理端点必须限流");
  assert.ok(!src.includes("config.supabase.anonKey"), "名单不能用 anon key 读");
});

test("隐私说明覆盖确认邮件，且表单上报界面语言", () => {
  const html = read("public/relaywork.html");
  assert.ok(html.includes("确认邮件"));
  assert.ok(html.includes("confirmation"));
  assert.ok(html.includes("lang: currentLang"), "表单需带上界面语言");
});
