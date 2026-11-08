import { guard } from "../../../lib/guard";
import { vectorStore } from "../../../src/shared/ai/vector";
import { ValidationError } from "../../../src/shared/errors";
import { handle, json } from "../../../src/shared/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { requestId }) =>
  json({ data: vectorStore.stats() }, { requestId })
);

export const POST = handle(async (req, { requestId, log }) => {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const { action, documents, query, topK } = g.body || {};
  if (action === "add") {
    const data = await vectorStore.add(documents);
    log.info("vector.add", { added: data.added, total: data.total });
    return json({ data }, { requestId });
  }
  if (action === "search") {
    const data = await vectorStore.search(query, topK);
    log.info("vector.search", { matches: data.length });
    return json({ data }, { requestId });
  }
  throw new ValidationError("action 必须是 add 或 search", [
    { field: "action", message: "expected add | search" },
  ]);
});
