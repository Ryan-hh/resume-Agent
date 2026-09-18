// 统一的 AI 错误码：保留原有 UI 文案映射的入口，底层实现全部换成 LangChain
export type AIErrorCode =
  | "networkError"
  | "timeout"
  | "unauthorized"
  | "modelNotFound"
  | "badRequest"
  | "upstreamError";

export class AIRequestError extends Error {
  readonly code: AIErrorCode;
  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIRequestError";
    this.code = code;
  }
}

function isAbortLike(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "AbortError"
  );
}

// 把 LangChain / 上游错误映射回统一错误码（保留现有 UI 文案）。
// 各家 SDK 的错误（OpenAI/Anthropic/Gemini）都带 status，这里 duck-typing 处理。
export function toAIError(error: unknown): AIRequestError {
  if (error instanceof AIRequestError) return error;

  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return new AIRequestError("unauthorized", error instanceof Error ? error.message : "");
    }
    if (status === 404) {
      return new AIRequestError("modelNotFound", error instanceof Error ? error.message : "");
    }
    if (status === 400 || status === 422) {
      return new AIRequestError("badRequest", error instanceof Error ? error.message : "");
    }
    if (status === 408 || status === 504) {
      return new AIRequestError("timeout", error instanceof Error ? error.message : "");
    }
    return new AIRequestError("upstreamError", error instanceof Error ? error.message : "");
  }

  const err = error as { name?: string; code?: string; message?: string };
  const name = err?.name ?? "";
  const code = err?.code ?? "";
  if (isAbortLike(error) || name.includes("Timeout") || code === "timeout") {
    return new AIRequestError("timeout", err?.message ?? "请求超时");
  }
  if (name === "TypeError" || name.includes("Network") || code === "network") {
    return new AIRequestError("networkError", err?.message ?? "网络请求失败");
  }
  return new AIRequestError(
    "upstreamError",
    error instanceof Error ? error.message : "AI 请求失败"
  );
}

// Agent 循环的错误文案（中文，供面板展示）
export function describeAIError(error: unknown): string {
  const mapped = toAIError(error);
  const map: Record<AIErrorCode, string> = {
    networkError: "网络请求失败，请检查网络后重试",
    timeout: "请求超时，请重试或更换更快的模型",
    unauthorized: "API Key 无效或没有权限，请检查 AI 配置",
    modelNotFound: "模型不存在，请在 AI 配置中检查模型 ID",
    badRequest: "请求被拒绝，请检查所选模型与参数",
    upstreamError: "AI 服务返回异常，请重试",
  };
  const base = map[mapped.code];
  return mapped.code === "networkError" || mapped.code === "timeout"
    ? base
    : `${base}：${mapped.message}`;
}
