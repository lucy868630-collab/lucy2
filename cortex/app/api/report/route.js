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

    const isEn = lang === "en";
    const sys = isEn
      ? [
          "You are Cortex, a senior business analyst for NZ small businesses. Write a concise business report in English based ONLY on the provided data. Plain text, under 450 words.",
          "The uploaded dataset may be in Chinese or another language. Translate every domain term, column name, category, product, region, channel and time label into natural English. On first mention you may add the original in parentheses, e.g. Online channel (线上渠道). Keep numbers, currency codes, IDs and well-known brand names unchanged. Never output non-English sentences or headings.",
        ].join(" ")
      : [
          "你是 Cortex，新西兰小企业的资深商业分析师。仅基于提供的数据撰写简洁的商业分析报告，简体中文，纯文本，450字以内。",
          "上传的数据可能是英文或其它语言。报告里的领域术语、列名、品类、商品、地区、渠道、时间标签等都要自然译成简体中文；首次出现时可用括号附原文，例如「线上渠道（Online）」。数字、货币代码、编号、知名品牌名保持原样。禁止出现英文段落、英文小标题或整句夹带外语。",
        ].join("");

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.5,
        max_tokens: 1600,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: (isEn ? "Dashboard data (JSON):\n" : "仪表板数据（JSON，其中名称可能是外语，请按上述规则翻译）：\n") + JSON.stringify(summary) },
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
