import { ValidationError } from "../errors.js";
import { embed, localEmbedding, VECTOR_DIM } from "./embeddings.js";

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/**
 * 进程内向量库（cosine 检索）。接口与 Pinecone / pgvector 适配器一致，
 * 换后端时只需替换 createVectorStore 的实现。Serverless 多实例间不共享内存。
 */
export function createVectorStore() {
  const entries = [];
  let backend = "local-hash";

  return {
    async add(documents) {
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new ValidationError("documents 必须是非空数组", [
          { field: "documents", message: "required non-empty array" },
        ]);
      }
      if (documents.length > 200) {
        throw new ValidationError("单次最多写入 200 条", [
          { field: "documents", message: "too many documents" },
        ]);
      }
      const clean = documents.map((d, i) => ({
        id: String(d?.id ?? `doc-${Date.now()}-${i}`),
        text: String(d?.text ?? ""),
        metadata: d?.metadata ?? {},
      }));
      const result = await embed(clean.map((d) => d.text));
      backend = result.backend;
      for (let i = 0; i < clean.length; i++) {
        const found = entries.findIndex((e) => e.id === clean[i].id);
        const record = { ...clean[i], vector: result.vectors[i] };
        if (found >= 0) entries[found] = record;
        else entries.push(record);
      }
      return { added: clean.length, total: entries.length, backend };
    },

    async search(query, topK = 5) {
      const q = String(query || "").trim();
      if (!q) throw new ValidationError("query 不能为空", [{ field: "query", message: "required" }]);
      const k = Math.min(Math.max(Number(topK) || 5, 1), 50);
      // 查询向量始终与库内向量同构，避免远程/本地维度不一致
      const qv = backend === "local-hash" ? localEmbedding(q, VECTOR_DIM) : (await embed([q])).vectors[0];
      return entries
        .map((e) => ({
          id: e.id,
          text: e.text,
          metadata: e.metadata,
          score: Math.round(cosineSimilarity(qv, e.vector) * 10000) / 10000,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    },

    stats() {
      return {
        count: entries.length,
        dimensions: VECTOR_DIM,
        backend: "in-memory cosine",
        embeddings: backend,
      };
    },
  };
}

export const vectorStore = createVectorStore();
