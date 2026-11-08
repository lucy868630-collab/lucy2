import { createClient } from "@supabase/supabase-js";
import { config } from "../../shared/config.js";
import { UpstreamError } from "../../shared/errors.js";

const SELECT =
  "order_date, product_category, product_name, region, channel, quantity, revenue, profit";

/** 数据访问层：只做查询，不含任何业务规则，也不接触 HTTP 类型。 */
export function ordersRepository(token) {
  const client = createClient(config.supabase.url, config.supabase.anonKey, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async list({ userId, from, to }) {
      let query = client
        .from("orders")
        .select(SELECT)
        .eq("user_id", userId)
        .order("order_date", { ascending: true })
        .limit(10000);
      if (from) query = query.gte("order_date", from);
      if (to) query = query.lte("order_date", to);
      const { data, error } = await query;
      if (error) throw new UpstreamError("读取订单数据失败", { message: error.message });
      return data || [];
    },
  };
}
