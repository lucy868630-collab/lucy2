// 集中配置：全项目只有这里读取 process.env，其余模块一律 import config。
// 可选组件（Redis / MongoDB / OpenAI / HF）未配置时自动降级，不阻断启动。
const read = (name, fallback = "") => String(process.env[name] ?? fallback).trim();
const int = (name, fallback) => {
  const n = Number.parseInt(read(name, String(fallback)), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const supabaseUrl = read("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const deepseekKey = read("DEEPSEEK_API_KEY");
const openaiKey = read("OPENAI_API_KEY");
const hfToken = read("HF_API_TOKEN");

export const config = {
  app: {
    name: "cortex",
    version: "3.1.0",
    env: read("NODE_ENV", "development"),
  },
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseKey,
    configured: Boolean(
      supabaseUrl && supabaseKey &&
      !supabaseUrl.includes("placeholder") &&
      !supabaseUrl.includes("your-project")
    ),
  },
  ai: {
    provider: read("AI_PROVIDER", "auto"),
    deepseekKey,
    openaiKey,
    hfToken,
    deepseekModel: read("DEEPSEEK_MODEL", "deepseek-chat"),
    openaiModel: read("OPENAI_MODEL", "gpt-4o-mini"),
    hfModel: read("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct"),
    embeddingModel: read("EMBEDDING_MODEL", "text-embedding-3-small"),
    timeoutMs: int("AI_TIMEOUT_MS", 30000),
  },
  redis: {
    url: read("REDIS_URL"),
    ttlSeconds: int("CACHE_TTL_SECONDS", 60),
  },
  mongo: {
    uri: read("MONGODB_URI"),
    database: read("MONGODB_DB", "cortex"),
    collection: read("MONGODB_COLLECTION", "events"),
  },
  oauth: {
    googleEnabled: read("NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN", "false").toLowerCase() === "true",
  },
  api: {
    baseUrl: read("NEXT_PUBLIC_API_URL", "http://localhost:3000"),
  },
  observability: {
    logLevel: read("LOG_LEVEL", "info"),
  },
};

/** 按 AI_PROVIDER 显式选择，或按可用密钥自动选择。 */
export function activeAIProvider() {
  const p = config.ai.provider;
  const pairs = [
    ["deepseek", deepseekKey],
    ["openai", openaiKey],
    ["huggingface", hfToken],
  ];
  if (p !== "auto") {
    const hit = pairs.find(([name, key]) => name === p && key);
    return hit ? hit[0] : "none";
  }
  const first = pairs.find(([, key]) => key);
  return first ? first[0] : "none";
}

/** 启动自检：核心层缺失时列出问题（演示模式允许缺失，但 /api/ready 会如实报告）。 */
export function coreConfigIssues() {
  const issues = [];
  if (!config.supabase.configured) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (activeAIProvider() === "none") {
    issues.push("DEEPSEEK_API_KEY / OPENAI_API_KEY / HF_API_TOKEN（至少一项）");
  }
  return issues;
}
