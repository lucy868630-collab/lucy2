import { guard } from "../../../lib/guard.js";
import { requireUser } from "../../shared/auth.js";
import { json } from "../../shared/http.js";
import { parseListQuery, parseRowsBody } from "./schema.js";
import { aggregate, getInsights } from "./service.js";

/** GET /api/insights — 读取当前用户已入库的订单并聚合。 */
export async function listInsights(req, { requestId, log }) {
  const { userId, token } = await requireUser(req);
  const query = parseListQuery(new URL(req.url).searchParams);
  const data = await getInsights({ userId, token, query, log });
  return json({ data }, { requestId });
}

/** POST /api/insights — 对客户端提交的行做即时聚合，不写库（供 App / 外部系统调用）。 */
export async function analyzeInsights(req, { requestId, log }) {
  const g = await guard(req);
  if (!g.ok) return g.response;
  const { rows, group, top } = parseRowsBody(g.body);
  const data = {
    meta: {
      group,
      generated_at: new Date().toISOString(),
      source: "request",
      cached: false,
    },
    ...aggregate(rows, { group, top }),
  };
  log.info("insights.analyzed", { rows: rows.length, group });
  return json({ data }, { requestId });
}
