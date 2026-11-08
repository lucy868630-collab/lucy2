/**
 * AWS Lambda / API Gateway(HTTP API v2 或 REST v1) 适配器。
 * 轻量代理到已部署的 Cortex API，不把 Next 服务器塞进 Lambda；
 * 纯 Node 原生实现，无第三方依赖，可直接用 node --test 验证。
 */
export function createHandler({ baseUrl = process.env.CORTEX_BASE_URL || "", fetchImpl = fetch } = {}) {
  const root = baseUrl.replace(/\/$/, "");

  return async function handler(event = {}) {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const path = event.rawPath || event.path || "/";
    const query = event.rawQueryString || "";
    const url = `${root}${path}${query ? `?${query}` : ""}`;

    const headers = { ...(event.headers || {}) };
    delete headers.host;
    delete headers["content-length"];
    delete headers.Host;

    let body;
    if (event.body) {
      body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
    }

    try {
      const res = await fetchImpl(url, { method, headers, body });
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { "content-type": res.headers.get("content-type") || "application/json; charset=utf-8" },
        body: text,
      };
    } catch (err) {
      return {
        statusCode: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ code: "UPSTREAM_ERROR", detail: "无法连接 Cortex API" }),
      };
    }
  };
}

export const handler = createHandler();
