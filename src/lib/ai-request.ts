import type { AIConnection } from "@/config/ai-models";

export type AIRequestErrorCode =
  | "networkError"
  | "timeout"
  | "unauthorized"
  | "modelNotFound"
  | "badRequest"
  | "upstreamError";

export class AIRequestError extends Error {
  code: AIRequestErrorCode;
  constructor(code: AIRequestErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AIRequestError";
    this.code = code;
  }
}

const REQUEST_TIMEOUT = 30_000;

function timeoutSignal(timeoutMs = REQUEST_TIMEOUT): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function mapStatus(status: number): AIRequestErrorCode {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "modelNotFound";
  if (status === 400 || status === 422) return "badRequest";
  return "upstreamError";
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : "") ||
      "";
    return String(message).slice(0, 200);
  } catch {
    return "";
  }
}

// 轻量连通性测试：三种协议各发一个最小请求，模型可用即返回
export async function testAIConnection(connection: AIConnection): Promise<string> {
  const { baseUrl, apiKey, model } = connection;

  if (connection.protocol === "gemini") {
    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        signal: timeoutSignal(),
      });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(
        mapStatus(response.status),
        await parseErrorBody(response)
      );
    }
    const data = await response.json().catch(() => null);
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "ok";
    return String(text).slice(0, 100);
  }

  if (connection.protocol === "anthropic") {
    // Anthropic 兼容端点（官方 /v1/messages；DeepSeek 等第三方 baseUrl 不带 /v1，需补上）
    const root = baseUrl.trim().replace(/\/+$/, "");
    const url = /\/v1$/i.test(root) ? `${root}/messages` : `${root}/v1/messages`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: timeoutSignal(),
      });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(
        mapStatus(response.status),
        await parseErrorBody(response)
      );
    }
    const data = await response.json().catch(() => null);
    const text = data?.content?.[0]?.text ?? "ok";
    return String(text).slice(0, 100);
  }

  // chat-completions（OpenAI / DeepSeek / 通义千问 等兼容端点）
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      }),
      signal: timeoutSignal(),
    });
  } catch {
    throw new AIRequestError("networkError");
  }
  if (!response.ok) {
    throw new AIRequestError(
      mapStatus(response.status),
      await parseErrorBody(response)
    );
  }
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content ?? "ok";
  return String(text).slice(0, 100);
}

// 拉取厂商当前可用模型列表：
// - OpenAI 兼容端点（OpenAI/DeepSeek/通义等）→ GET {baseUrl}/models
// - Gemini → GET {baseUrl}/v1beta/models
// - Anthropic 兼容端点：官方无列表接口；但形如 xxx/anthropic 的第三方端点
//   （如 DeepSeek https://api.deepseek.com/anthropic）可推导其 OpenAI 兼容端点拉取
export async function fetchProviderModels(
  connection: AIConnection
): Promise<string[]> {
  const { baseUrl, apiKey, protocol } = connection;

  if (protocol === "gemini") {
    const url = `${baseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    let response: Response;
    try {
      response = await fetch(url, { signal: timeoutSignal() });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(
        mapStatus(response.status),
        await parseErrorBody(response)
      );
    }
    const data = await response.json().catch(() => null);
    const list = Array.isArray(data?.models)
      ? data.models
          .map((m: { name?: string }) =>
            String(m.name ?? "").replace(/^models\//, "")
          )
          .filter(Boolean)
      : [];
    return list;
  }

  if (protocol === "anthropic") {
    const root = baseUrl.trim().replace(/\/+$/, "");
    // 形如 https://xxx/anthropic 的第三方端点：去掉 /anthropic 后按 OpenAI 兼容端点拉取
    const openaiMatch = root.match(/^(https?:\/\/[^/]+(?:\/[^/]+)*)\/anthropic$/i);
    if (openaiMatch) {
      try {
        const response = await fetch(`${openaiMatch[1]}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: timeoutSignal(),
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          const list = Array.isArray(data?.data)
            ? data.data
                .map((m: { id?: string }) => String(m.id ?? ""))
                .filter(Boolean)
            : [];
          if (list.length > 0) return list;
        }
      } catch {
        // 网络异常不阻断：回落为手输
      }
    }
    return [];
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: timeoutSignal(),
    });
  } catch {
    throw new AIRequestError("networkError");
  }
  if (!response.ok) {
    throw new AIRequestError(
      mapStatus(response.status),
      await parseErrorBody(response)
    );
  }
  const data = await response.json().catch(() => null);
  const list = Array.isArray(data?.data)
    ? data.data
        .map((m: { id?: string }) => String(m.id ?? ""))
        .filter(Boolean)
    : [];
  return list;
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string };

export type ChatMessageContent = string | ChatContentPart[];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent;
}

type NormalizedPart =
  | { kind: "text"; text: string }
  | { kind: "image"; dataUrl: string };

function normalizeContent(content: ChatMessageContent): NormalizedPart[] {
  if (typeof content === "string") return content ? [{ kind: "text", text: content }] : [];
  return content.map((part) =>
    part.type === "text"
      ? { kind: "text", text: part.text }
      : { kind: "image", dataUrl: part.image_url }
  );
}

function imageMeta(dataUrl: string): { mimeType: string; data: string } {
  const [header, data] = dataUrl.split(",");
  return { mimeType: header.slice(5, -7), data };
}

// 通用对话补全：按协议发一次完整请求，返回模型生成的全文（供 AI 润色、简历导入等场景使用）
export async function chatCompletion(
  connection: AIConnection,
  messages: ChatMessage[],
  maxTokens = 4000,
  timeoutMs = REQUEST_TIMEOUT
): Promise<string> {
  const { baseUrl, apiKey, model, protocol } = connection;

  if (protocol === "gemini") {
    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: normalizeContent(m.content).map((part) =>
          part.kind === "text"
            ? { text: part.text }
            : { inlineData: imageMeta(part.dataUrl) }
        ),
      }));
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: maxTokens },
          ...(messages[0]?.role === "system"
            ? {
                systemInstruction: {
                  parts: [
                    {
                      text: normalizeContent(messages[0].content)
                        .filter((p) => p.kind === "text")
                        .map((p) => p.text)
                        .join("\n"),
                    },
                  ],
                },
              }
            : {}),
        }),
        signal: timeoutSignal(timeoutMs),
      });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(
        mapStatus(response.status),
        await parseErrorBody(response)
      );
    }
    const data = await response.json().catch(() => null);
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";
    if (!text) throw new AIRequestError("upstreamError", "模型未返回内容");
    return text;
  }

  if (protocol === "anthropic") {
    const root = baseUrl.trim().replace(/\/+$/, "");
    const url = /\/v1$/i.test(root) ? `${root}/messages` : `${root}/v1/messages`;
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) =>
        normalizeContent(m.content)
          .filter((p) => p.kind === "text")
          .map((p) => p.text)
          .join("\n")
      )
      .join("\n");
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          ...(system ? { system } : {}),
          messages: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: normalizeContent(m.content).map((part) =>
                part.kind === "text"
                  ? { type: "text", text: part.text }
                  : {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: imageMeta(part.dataUrl).mimeType,
                        data: imageMeta(part.dataUrl).data,
                      },
                    }
              ),
            })),
        }),
        signal: timeoutSignal(timeoutMs),
      });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(
        mapStatus(response.status),
        await parseErrorBody(response)
      );
    }
    const data = await response.json().catch(() => null);
    const text = data?.content?.[0]?.text ?? "";
    if (!text) throw new AIRequestError("upstreamError", "模型未返回内容");
    return text;
  }

  // chat-completions（OpenAI / DeepSeek / 通义千问 等兼容端点）
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => {
          const parts = normalizeContent(m.content);
          const hasImage = parts.some((p) => p.kind === "image");
          return {
            role: m.role,
            content: hasImage
              ? [
                  ...parts
                    .filter((p) => p.kind === "text")
                    .map((p) => ({ type: "text", text: p.text })),
                  ...parts
                    .filter((p) => p.kind === "image")
                    .map((p) => ({
                      type: "image_url",
                      image_url: { url: p.dataUrl },
                    })),
                ]
              : (m.content as string),
          };
        }),
        max_tokens: maxTokens,
      }),
      signal: timeoutSignal(timeoutMs),
    });
  } catch {
    throw new AIRequestError("networkError");
  }
  if (!response.ok) {
    throw new AIRequestError(
      mapStatus(response.status),
      await parseErrorBody(response)
    );
  }
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new AIRequestError("upstreamError", "模型未返回内容");
  return text;
}
