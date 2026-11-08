import { activeAIProvider, config } from "../config.js";

export const VECTOR_DIM = 128;

/**
 * 本地确定性向量（字符 3-gram 哈希）。无 API 密钥时也能跑通向量检索，
 * 但语义精度有限，生产环境应配置 OpenAI embeddings 或 pgvector 方案。
 */
export function localEmbedding(text, dim = VECTOR_DIM) {
  const vector = new Array(dim).fill(0);
  const s = String(text || "").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    const gram = s.slice(i, i + 3);
    let h = 2166136261;
    for (let j = 0; j < gram.length; j++) {
      h ^= gram.charCodeAt(j);
      h = Math.imul(h, 16777619);
    }
    vector[Math.abs(h) % dim] += 1;
  }
  let norm = 0;
  for (const x of vector) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return vector.map((x) => x / norm);
}

async function remoteEmbeddings(texts, provider) {
  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/embeddings"
      : "https://api.deepseek.com/v1/embeddings";
  const key = provider === "openai" ? config.ai.openaiKey : config.ai.deepseekKey;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model: config.ai.embeddingModel, input: texts }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("embeddings " + res.status);
    const body = await res.json();
    const vectors = body.data?.map((d) => d.embedding);
    if (!vectors || vectors.length !== texts.length) throw new Error("invalid embeddings response");
    return { vectors, backend: provider + ":" + config.ai.embeddingModel };
  } finally {
    clearTimeout(timer);
  }
}

/** 优先远程 embeddings，失败或未配置时静默降级为本地向量。 */
export async function embed(texts, { preferRemote = true } = {}) {
  const provider = activeAIProvider();
  if (preferRemote && (provider === "openai" || provider === "deepseek")) {
    try {
      return await remoteEmbeddings(texts, provider);
    } catch {
      // 降级：不让 embeddings 故障阻断检索链路
    }
  }
  return { vectors: texts.map((t) => localEmbedding(t)), backend: "local-hash" };
}
