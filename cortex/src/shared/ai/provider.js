import { activeAIProvider, config } from "../config.js";
import { UpstreamError, ValidationError } from "../errors.js";

// 三家都走 OpenAI 兼容的 chat/completions 协议，因此用同一套调用逻辑。
const ENDPOINTS = {
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    key: () => config.ai.deepseekKey,
    model: () => config.ai.deepseekModel,
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    key: () => config.ai.openaiKey,
    model: () => config.ai.openaiModel,
  },
  huggingface: {
    url: "https://router.huggingface.co/v1/chat/completions",
    key: () => config.ai.hfToken,
    model: () => config.ai.hfModel,
  },
};

export function providerInfo() {
  const name = activeAIProvider();
  return {
    provider: name,
    model: name === "none" ? null : ENDPOINTS[name].model(),
    configured: name !== "none",
  };
}

async function callChat(provider, messages, options) {
  const endpoint = ENDPOINTS[provider];
  const apiKey = endpoint.key();
  if (!apiKey) throw new ValidationError(`AI provider「${provider}」未配置密钥`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: endpoint.model(),
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 800,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const err = new UpstreamError(`AI 服务返回 ${res.status}`, { detail });
      err.retryable = res.status >= 500 || res.status === 429;
      throw err;
    }
    const body = await res.json();
    return {
      text: body.choices?.[0]?.message?.content || "",
      usage: body.usage || null,
      model: endpoint.model(),
      provider,
    };
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof ValidationError) throw err;
    const wrapped = new UpstreamError("AI 服务网络错误", { message: err.message });
    wrapped.retryable = true;
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}

/** 统一模型调用：按 AI_PROVIDER / 可用密钥自动选择，瞬时失败指数退避重试，4xx 不重试。 */
export async function chat(messages, options = {}) {
  const provider = options.provider || activeAIProvider();
  if (provider === "none" || !ENDPOINTS[provider]) {
    throw new ValidationError("未配置可用的 AI 密钥（DEEPSEEK_API_KEY / OPENAI_API_KEY / HF_API_TOKEN）");
  }
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callChat(provider, messages, options);
    } catch (err) {
      lastError = err;
      if (err.retryable === false || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
    }
  }
  throw lastError;
}
