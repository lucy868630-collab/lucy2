import { guard } from "../../../lib/guard";

export async function POST(req) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  try {
    const { summary, lang } = g.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
    }

    const sys =
      lang === "en"
        ? "You are Cortex, a senior business analyst for NZ small businesses. Write a concise business report in English based ONLY on the provided data. Plain text, under 450 words."
        : "你是 Cortex，新西兰小企业的资深商业分析师。仅基于提供的数据撰写简洁的商业分析报告，简体中文，纯文本，450字以内。";

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.5,
        max_tokens: 1200,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: "仪表板数据（JSON）：\n" + JSON.stringify(summary) },
        ],
      }),
    });

    if (!resp.ok) {
      let detail = resp.status;
      try {
        const j = await resp.json();
        detail = j.error?.message || detail;
      } catch {}
      return Response.json({ error: "AI 服务返回错误: " + detail }, { status: 502 });
    }

    const j = await resp.json();
    const report = j.choices?.[0]?.message?.content || "";
    return Response.json({ report });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
