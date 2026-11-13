import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "public/pipeline.html"), "utf8");

test("外联看板是自包含单文件，无外部资源请求", () => {
  assert.ok(html.includes('name="robots" content="noindex, nofollow"'), "内部工具不应被索引");
  assert.ok(!html.includes("http://") && !html.includes("https://"), "不应加载 CDN 或外部资源");
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon/.test(html), "不得向服务器发送记录");
});

test("中英文字典键完全一致且覆盖全部状态与渠道", () => {
  const dict = html.split("I18N_DICT_START")[1].split("I18N_DICT_END")[0];
  const counts = {};
  for (const m of dict.matchAll(/'([^']+)'\s*:/g)) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  assert.deepEqual(Object.entries(counts).filter(([, n]) => n !== 2).map(([k]) => k), []);
  assert.ok(Object.keys(counts).length >= 50, "字典键数量异常");
  for (const s of ["new", "contacted", "replied", "meeting", "won", "lost"]) {
    assert.ok(html.includes(`'status.${s}'`));
  }
  for (const c of ["email", "call", "linkedin", "other"]) {
    assert.ok(html.includes(`'channel.${c}'`));
  }
});

test("数据与合规边界：只存本机，不代找联系人、不代发、不外呼", () => {
  assert.ok(html.includes("localStorage"));
  assert.ok(html.includes("CAN-SPAM") && html.includes("GDPR") && html.includes("TCPA"));
  assert.ok(html.includes("替你查找联系人"));
  assert.ok(html.includes("does not find contacts"));
  assert.ok(html.includes("CSV_COLS") && html.includes("parseCsv") && html.includes("exportCsv"));
});

test("跟进提醒按 7 天计算且排除已结束状态", () => {
  assert.ok(html.includes("isStale"));
  assert.ok(html.includes("r.status === 'won' || r.status === 'lost'"));
  assert.ok(html.includes("86400000"));
});
