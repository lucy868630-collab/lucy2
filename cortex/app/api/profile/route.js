// AI 数据画像：让模型先读懂"这是什么数据、该怎么分析"，而不是硬套销售模板
import { guard } from "../../../lib/guard";

export async function POST(req) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  try {
    const { fields, sample, rowCount, fileName } = g.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return Response.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });

    const sys = `You are a data-understanding engine. Analyse the uploaded tabular dataset and output ONE JSON object only, no prose, no markdown fences. Schema:
{
 "title_zh":"数据集中文名","title_en":"Dataset name in English",
 "domain":"sales|tourism|finance|inventory|hr|other",
 "summary_zh":"一句话说明这份数据是什么","summary_en":"One sentence describing this dataset",
 "time_column":"时间列名，没有则空字符串",
 "dimension_columns":["可用于分组对比的维度列名，最多3个"],
 "metrics":[{"column":"数值列名","label_zh":"中文指标名","label_en":"English metric name","unit":"NZD|count|days|percent|number","agg":"sum|avg"}],
 "primary_metric":"最重要的数值列名",
 "suggestions_zh":["3条具体分析建议"],"suggestions_en":["3 specific analysis suggestions"],
 "caveats_zh":"数据局限或解读注意事项","caveats_en":"Data limitations or interpretation caveats"
}
Rules: only use column names that actually exist in fields. Pick at most 4 metrics. Never invent columns. Prefer columns whose sample values are numeric for metrics, and text/categorical for dimensions.
Language rules: every *_zh field must be Simplified Chinese. The uploaded dataset may be in English or another language, so translate foreign column names, categories and domain terms into natural Chinese within *_zh fields (the original may be added in parentheses on first mention). Every *_en field must be English, translating Chinese terms into English. The machine-readable fields time_column, dimension_columns, metrics[].column and primary_metric must copy the original column names verbatim and must NEVER be translated. Numbers, codes and brand names stay unchanged.`;

    const user = JSON.stringify({ fileName, rowCount, fields, sample: (sample || []).slice(0, 6) });

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "deepseek-chat", temperature: 0.2, max_tokens: 900,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      }),
    });
    if (!resp.ok) return Response.json({ error: "AI 服务错误 " + resp.status }, { status: 502 });
    const j = await resp.json();
    let text = j.choices?.[0]?.message?.content || "";
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b < a) return Response.json({ error: "AI 未返回有效 JSON" }, { status: 502 });
    const profile = JSON.parse(text.slice(a, b + 1));
    return Response.json({ profile });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
