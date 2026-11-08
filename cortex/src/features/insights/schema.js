import { ValidationError } from "../../shared/errors.js";

export const GROUPS = ["category", "region", "channel", "month"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const text = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s || fallback;
};

function topFrom(raw, defaultValue = 20) {
  const n = Number.parseInt(raw ?? String(defaultValue), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 100) : defaultValue;
}

export function parseListQuery(params) {
  const errors = [];
  const group = String(params.get("group") || "category").toLowerCase();
  const from = String(params.get("from") || "");
  const to = String(params.get("to") || "");
  if (!GROUPS.includes(group)) {
    errors.push({ field: "group", message: `must be one of ${GROUPS.join(", ")}` });
  }
  if (from && !ISO_DATE.test(from)) errors.push({ field: "from", message: "expected YYYY-MM-DD" });
  if (to && !ISO_DATE.test(to)) errors.push({ field: "to", message: "expected YYYY-MM-DD" });
  if (from && to && from > to) errors.push({ field: "to", message: "must not be earlier than from" });
  if (errors.length) throw new ValidationError("查询参数不合法", errors);
  return { group, from, to, top: topFrom(params.get("top")) };
}

// 客户端传入行时只接受白名单列，避免任意字段进入聚合逻辑。
const ROW_FIELDS = {
  order_date: "order_date",
  date: "order_date",
  product_category: "product_category",
  category: "product_category",
  product_name: "product_name",
  region: "region",
  channel: "channel",
  quantity: "quantity",
  revenue: "revenue",
  revenue_nzd: "revenue",
  profit: "profit",
  profit_nzd: "profit",
};
const NUMERIC = new Set(["quantity", "revenue", "profit"]);

export function parseRowsBody(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.rows)) {
    throw new ValidationError("请求体必须包含 rows 数组", [
      { field: "rows", message: "required array" },
    ]);
  }
  if (body.rows.length === 0) {
    throw new ValidationError("rows 不能为空", [{ field: "rows", message: "must not be empty" }]);
  }
  if (body.rows.length > 5000) {
    throw new ValidationError("单次最多分析 5000 行", [{ field: "rows", message: "too many rows" }]);
  }
  const group = String(body.group || "category").toLowerCase();
  if (!GROUPS.includes(group)) {
    throw new ValidationError("group 不合法", [
      { field: "group", message: `must be one of ${GROUPS.join(", ")}` },
    ]);
  }

  const rows = body.rows.map((raw, i) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError(`rows[${i}] 必须是对象`, [
        { field: `rows[${i}]`, message: "expected object" },
      ]);
    }
    const out = {
      order_date: "",
      product_category: "—",
      product_name: "—",
      region: "—",
      channel: "—",
      quantity: 0,
      revenue: 0,
      profit: 0,
    };
    for (const [k, v] of Object.entries(raw)) {
      const std = ROW_FIELDS[String(k).trim().toLowerCase()];
      if (!std) continue;
      if (NUMERIC.has(std)) out[std] = num(v);
      else out[std] = text(v, std === "order_date" ? "" : "—");
    }
    return out;
  });

  return { rows, group, top: topFrom(body.top) };
}
