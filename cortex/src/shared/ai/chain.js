import { ValidationError } from "../errors.js";
import { chat } from "./provider.js";

/**
 * 轻量链式编排：prompt → model → parser。
 * 步骤接口与 LangChain 的 chain 概念对齐，接入 langchain 时只需替换 runChain 内部实现。
 */
export async function runChain({ steps, input }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new ValidationError("chain steps 不能为空", [{ field: "steps", message: "required" }]);
  }
  let value = input;
  const trace = [];

  for (const step of steps) {
    const started = Date.now();
    if (step.type === "prompt") {
      value = step.render(value);
    } else if (step.type === "model") {
      const messages = typeof value === "string" ? [{ role: "user", content: value }] : value;
      const result = await chat(messages, {
        temperature: step.temperature,
        maxTokens: step.maxTokens,
      });
      value = result.text;
      trace.push({
        step: step.name || "model",
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        duration_ms: Date.now() - started,
      });
    } else if (step.type === "parse") {
      value = step.parse(value);
    } else {
      throw new ValidationError(`未知的 chain step 类型：${step.type}`, [
        { field: "steps", message: "unsupported step type" },
      ]);
    }
    if (step.type !== "model") {
      trace.push({ step: step.name || step.type, duration_ms: Date.now() - started });
    }
  }

  return { output: value, trace };
}

/** 双语问答链：把上下文与问题组装成 system + user，再交给当前 provider。 */
export function buildQaChain({ lang = "zh" } = {}) {
  const system =
    lang === "en"
      ? "You are Cortex, a concise business analyst. Answer in English using only the provided context. If the context is insufficient, say so explicitly. Keep it under 200 words."
      : "你是 Cortex，简洁的商业分析师。只依据提供的上下文用简体中文回答；上下文不足时明确说明。控制在 300 字以内。";
  return [
    {
      type: "prompt",
      name: "compose",
      render: (input) => [
        { role: "system", content: system },
        {
          role: "user",
          content: `上下文：\n${String(input.context || "（无）").slice(0, 6000)}\n\n问题：${String(input.question || "").slice(0, 1000)}`,
        },
      ],
    },
    { type: "model", name: "answer", temperature: 0.3, maxTokens: 600 },
    { type: "parse", name: "clean", parse: (text) => String(text || "").trim() },
  ];
}
