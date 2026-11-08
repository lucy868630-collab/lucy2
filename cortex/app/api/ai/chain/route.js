import { guard } from "../../../../lib/guard";
import { buildQaChain, runChain } from "../../../../src/shared/ai/chain";
import { providerInfo } from "../../../../src/shared/ai/provider";
import { ValidationError } from "../../../../src/shared/errors";
import { handle, json } from "../../../../src/shared/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { requestId }) =>
  json(
    {
      data: {
        ...providerInfo(),
        chain: ["prompt", "model", "parser"],
        note: "步骤接口与 LangChain 对齐，可直接替换实现",
      },
    },
    { requestId }
  )
);

export const POST = handle(async (req, { requestId, log }) => {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const body = g.body || {};
  const question = String(body.question || "").trim();
  if (!question) {
    throw new ValidationError("question 不能为空", [{ field: "question", message: "required" }]);
  }
  if (question.length > 1000) {
    throw new ValidationError("question 过长（上限 1000 字）", [
      { field: "question", message: "too long" },
    ]);
  }

  const lang = body.lang === "en" ? "en" : "zh";
  const result = await runChain({
    steps: buildQaChain({ lang }),
    input: { question, context: String(body.context || "").slice(0, 6000) },
  });
  log.info("ai.chain.completed", { steps: result.trace.length, lang, provider: providerInfo().provider });
  return json(
    { data: { answer: result.output, trace: result.trace, provider: providerInfo() } },
    { requestId }
  );
});
