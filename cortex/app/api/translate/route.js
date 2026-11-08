import { createHash } from "node:crypto";
import { chat, providerInfo } from "../../../src/shared/ai/provider.js";
import { rateLimit, requireUser } from "../../../src/shared/auth.js";
import { cacheGet, cacheSet } from "../../../src/shared/cache.js";
import { UnauthorizedError, ValidationError } from "../../../src/shared/errors.js";
import { handle, json } from "../../../src/shared/http.js";

export const dynamic = "force-dynamic";

const LANGUAGES = {
  zh: "Simplified Chinese",
  en: "English",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
};

const MAX_BODY = 20000;
const MAX_TEXT = 8000;
const MAX_ITEMS = 60;

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

function systemPrompt(targetLang, mode) {
  const rules = [
    "You are a professional translator for a business analytics product.",
    `Translate the supplied text into ${LANGUAGES[targetLang]}.`,
    "Output ONLY the translation: no preface, no notes, no markdown fences.",
    "Preserve every number, currency code, date, ID, column name, code snippet and brand name exactly as written.",
    "Keep the original line breaks, bullet numbering and heading structure.",
    "Never add, remove, summarise or explain any content.",
  ];
  if (mode === "json") {
    rules.push("The input is a JSON object of {key: text}. Return ONE JSON object with exactly the same keys and translated string values.");
  }
  if (mode === "report") {
    rules.push("This is a business report: keep a professional tone and never translate machine-readable column names.");
  }
  rules.push("If a value is an HTML fragment, keep ALL tags, attributes and class names unchanged; translate only the visible text.");
  return rules.join(" ");
}

// 批量结果会被营销页写回 innerHTML：输入是站内静态文案，这里仍做一次基础清洗。
function safeFragment(value) {
  return String(value ?? "")
    .replace(/<\s*script\b/gi, "&lt;script")
    .replace(/\son\w+\s*=/gi, " data-removed=")
    .replace(/javascript\s*:/gi, "javascript-blocked:");
}

/** 通用翻译：单文本（工作台报告）或批量键值（落地页整页），结果按内容哈希缓存。 */
export const POST = handle(async (req, { requestId, log }) => {
  // 登录用户凭 Bearer token；公开访客必须同源。两者都受限流保护，避免被站外脚本刷 AI 额度。
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    await requireUser(req);
  } else {
    rateLimit(req);
    if (!sameOrigin(req)) throw new UnauthorizedError("请从本站页面发起翻译请求");
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY) {
    throw new ValidationError("请求体过大（上限 20000 字符）", [{ field: "body", message: "too large" }]);
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("请求体必须是 JSON", [{ field: "body", message: "invalid JSON" }]);
  }

  const targetLang = String(body?.targetLang || "").toLowerCase();
  if (!LANGUAGES[targetLang]) {
    throw new ValidationError("不支持的目标语言", [
      { field: "targetLang", message: `expected ${Object.keys(LANGUAGES).join(" | ")}` },
    ]);
  }

  const isBatch = Array.isArray(body?.items);
  let userContent;
  let mode;

  if (isBatch) {
    if (body.items.length === 0 || body.items.length > MAX_ITEMS) {
      throw new ValidationError(`批量条数需在 1–${MAX_ITEMS} 之间`, [{ field: "items", message: "invalid length" }]);
    }
    const input = {};
    for (const item of body.items) {
      const key = String(item?.key ?? "").slice(0, 80);
      const text = String(item?.text ?? "").slice(0, 600);
      if (!key) throw new ValidationError("items[].key 不能为空", [{ field: "key", message: "required" }]);
      input[key] = text;
    }
    userContent = JSON.stringify(input);
    mode = "json";
  } else {
    const text = String(body?.text ?? "").trim();
    if (!text) throw new ValidationError("text 不能为空", [{ field: "text", message: "required" }]);
    if (text.length > MAX_TEXT) {
      throw new ValidationError(`文本过长（上限 ${MAX_TEXT} 字）`, [{ field: "text", message: "too long" }]);
    }
    userContent = text;
    mode = body?.kind === "report" ? "report" : "text";
  }
  if (userContent.length > MAX_BODY) {
    throw new ValidationError("内容过长", [{ field: "content", message: "too large" }]);
  }

  const digest = createHash("sha256").update(userContent + "|" + targetLang).digest("hex").slice(0, 24);
  const cacheKey = `translate:v1:${digest}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    log.info("translate.cache_hit", { target: targetLang, batch: isBatch });
    return json({ data: { ...cached, cached: true } }, { requestId });
  }

  const result = await chat(
    [
      { role: "system", content: systemPrompt(targetLang, mode) },
      { role: "user", content: userContent },
    ],
    { temperature: 0.1, maxTokens: Math.min(6000, Math.ceil(userContent.length / 0.8) + 600) }
  );

  const output = result.text.trim();
  let data;
  if (isBatch) {
    const a = output.indexOf("{");
    const b = output.lastIndexOf("}");
    if (a < 0 || b <= a) {
      return json({ error: "AI 未返回有效翻译结果" }, { status: 502, requestId });
    }
    let parsed;
    try {
      parsed = JSON.parse(output.slice(a, b + 1));
    } catch {
      return json({ error: "AI 返回的翻译不是有效 JSON" }, { status: 502, requestId });
    }
    const items = {};
    for (const key of Object.keys(parsed)) items[key] = safeFragment(parsed[key]);
    data = { items, targetLang, mode: "batch" };
  } else {
    data = { text: output, targetLang, mode };
  }

  const payload = { ...data, provider: result.provider, model: result.model, cached: false };
  await cacheSet(cacheKey, data);
  log.info("translate.completed", { target: targetLang, batch: isBatch, chars: userContent.length, provider: result.provider });
  return json({ data: payload }, { requestId });
});

export const GET = handle(async (req, { requestId }) =>
  json(
    { data: { languages: Object.keys(LANGUAGES), ...providerInfo(), maxText: MAX_TEXT, maxItems: MAX_ITEMS } },
    { requestId }
  )
);
