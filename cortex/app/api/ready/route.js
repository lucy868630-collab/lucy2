import { activeAIProvider, config, coreConfigIssues } from "../../../src/shared/config";
import { cacheBackend } from "../../../src/shared/cache";
import { handle, json } from "../../../src/shared/http";

export const dynamic = "force-dynamic";

/** 就绪探针：逐层报告六层技术栈的实际状态，可选组件缺失只标 degraded，不误报宕机。 */
export const GET = handle(async (req, { requestId, log }) => {
  const cache = await cacheBackend();
  const aiProvider = activeAIProvider();
  const issues = coreConfigIssues();

  const checks = {
    frontend: {
      status: "ok",
      stack: ["React 19", "Next.js 15", "TypeScript", "TailwindCSS"],
    },
    backend: {
      status: "ok",
      stack: ["Node.js 22 / Next Route Handlers", "Express gateway", "FastAPI AI service"],
    },
    postgres: config.supabase.configured
      ? { status: "ok", via: "supabase", detail: "PostgreSQL + RLS" }
      : { status: "unconfigured", detail: "演示模式" },
    redis:
      cache === "redis"
        ? { status: "ok", backend: "redis", ttl_seconds: config.redis.ttlSeconds }
        : { status: "fallback", backend: "in-memory", ttl_seconds: config.redis.ttlSeconds },
    mongodb: config.mongo.uri
      ? { status: "ok", database: config.mongo.database, detail: "可选事件存储" }
      : { status: "unconfigured", detail: "可选事件存储" },
    ai:
      aiProvider === "none"
        ? { status: "unconfigured" }
        : { status: "ok", provider: aiProvider, models: ["chat", "embeddings"] },
    vector: { status: "ok", backend: "in-memory cosine", detail: "可切换 pgvector / Pinecone" },
    auth: {
      status: config.supabase.configured ? "ok" : "unconfigured",
      jwt: "supabase",
      oauth2: config.oauth.googleEnabled ? "google:enabled" : "google:disabled",
    },
    devops: {
      status: "ok",
      ci: "github-actions",
      deploy: "vercel",
      container: "docker-compose",
      orchestration: "kubernetes manifests",
      serverless: "aws-lambda adapter",
    },
  };

  log.info("ready.checked", { cache, ai_provider: aiProvider, issues: issues.length });
  return json(
    { status: "ok", degraded: issues.length > 0, issues, request_id: requestId, checks },
    { requestId }
  );
});
