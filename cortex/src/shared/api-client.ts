import type {
  ApiEnvelope,
  InsightPayload,
  ProblemDetails,
  ReadyResponse,
} from "../types/insights";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ProblemDetails | null) {
    super(body?.detail || `API error ${status}`);
    this.name = "ApiError";
  }
}

type TokenProvider = () => string | null;
let tokenProvider: TokenProvider = () => null;

/** 由 Supabase session 注入，避免把 token 存进 localStorage。 */
export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

export interface ApiOptions extends Omit<RequestInit, "headers"> {
  timeoutMs?: number;
  headers?: HeadersInit;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const merged: Record<string, string> = { "Content-Type": "application/json" };
  const token = tokenProvider();
  if (token) merged.Authorization = `Bearer ${token}`;
  if (headers) new Headers(headers).forEach((value, key) => { merged[key] = value; });

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: merged,
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, body as ProblemDetails | null);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  ready: () => request<ReadyResponse>("/api/ready"),
  insights: (params: { group?: string; from?: string; to?: string; top?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") q.set(key, String(value));
    });
    const suffix = q.toString();
    return request<ApiEnvelope<InsightPayload>>(`/api/insights${suffix ? `?${suffix}` : ""}`);
  },
};

/** 把 API 错误码映射成用户可读文案，不向用户暴露原始错误。 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401: return "登录已过期，请重新登录。";
      case 403: return "没有权限执行此操作。";
      case 404: return "请求的资源不存在。";
      case 422: return "提交的数据格式不正确，请检查后重试。";
      case 429: return "操作太频繁，请稍后再试。";
      default: return "服务暂时不可用，请稍后重试。";
    }
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "请求超时，请检查网络后重试。";
  }
  return "无法连接服务器，请检查网络。";
}
