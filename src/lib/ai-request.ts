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

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: ChatMessageContent;
  // assistant 消息携带本轮要执行的工具调用（OpenAI 协议续轮必需）
  toolCalls?: ToolCall[];
  // tool 消息：回填对应调用
  toolCallId?: string;
  toolName?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResponse {
  content: string;
  toolCalls: ToolCall[];
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

// ============ 工具调用（function calling） ============

function safeParseJson(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // fallthrough
    }
  }
  return {};
}

function normalizeTextContent(content: ChatMessageContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

// 带工具调用的对话补全：支持 OpenAI 兼容 / Gemini / Anthropic 三种协议。
// 调用方用统一的 ChatMessage 描述轮次，此处按协议翻译请求与响应。
export async function chatCompletionWithTools(
  connection: AIConnection,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  maxTokens = 4096,
  timeoutMs = REQUEST_TIMEOUT
): Promise<ToolResponse> {
  const { baseUrl, apiKey, model, protocol } = connection;

  if (protocol === "gemini") {
    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "model",
            parts: [
              ...normalizeContent(m.content)
                .filter((p): p is { kind: "text"; text: string } => p.kind === "text" && !!p.text)
                .map((p) => ({ text: p.text })),
              ...m.toolCalls.map((call) => ({
                functionCall: { name: call.name, args: call.arguments },
              })),
            ],
          };
        }
        if (m.role === "tool") {
          return {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: m.toolName ?? "unknown",
                  response: { result: normalizeTextContent(m.content) },
                },
              },
            ],
          };
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: normalizeContent(m.content).map((part) =>
            part.kind === "text"
              ? { text: part.text }
              : { inlineData: imageMeta(part.dataUrl) }
          ),
        };
      });
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          tools:
            tools.length > 0
              ? [
                  {
                    functionDeclarations: tools.map((t) => ({
                      name: t.name,
                      description: t.description,
                      parameters: t.parameters,
                    })),
                  },
                ]
              : undefined,
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
      throw new AIRequestError(mapStatus(response.status), await parseErrorBody(response));
    }
    const data = await response.json().catch(() => null);
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text?: string }) => p.text ?? "")
      .join("");
    const toolCalls: ToolCall[] = parts
      .filter((p: { functionCall?: unknown }) => p.functionCall)
      .map((p: { functionCall?: { name?: string; args?: unknown } }, i: number) => ({
        id: `fc-${i}`,
        name: p.functionCall?.name ?? "",
        arguments: safeParseJson(p.functionCall?.args),
      }))
      .filter((c: ToolCall) => c.name);
    return { content: text, toolCalls };
  }

  if (protocol === "anthropic") {
    const root = baseUrl.trim().replace(/\/+$/, "");
    const url = /\/v1$/i.test(root) ? `${root}/messages` : `${root}/v1/messages`;
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => normalizeTextContent(m.content))
      .join("\n");
    const bodyMessages = messages.filter((m) => m.role !== "system").map((m) => {
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant",
          content: [
            ...(normalizeTextContent(m.content)
              ? [{ type: "text" as const, text: normalizeTextContent(m.content) }]
              : []),
            ...m.toolCalls.map((call) => ({
              type: "tool_use" as const,
              id: call.id,
              name: call.name,
              input: call.arguments,
            })),
          ],
        };
      }
      if (m.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: m.toolCallId ?? "",
              content: normalizeTextContent(m.content),
            },
          ],
        };
      }
      return {
        role: m.role,
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
      };
    });
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
          messages: bodyMessages,
          ...(tools.length > 0
            ? {
                tools: tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  input_schema: t.parameters,
                })),
              }
            : {}),
        }),
        signal: timeoutSignal(timeoutMs),
      });
    } catch {
      throw new AIRequestError("networkError");
    }
    if (!response.ok) {
      throw new AIRequestError(mapStatus(response.status), await parseErrorBody(response));
    }
    const data = await response.json().catch(() => null);
    const blocks = Array.isArray(data?.content) ? data.content : [];
    const text = blocks
      .filter((b: { type?: string; text?: string }) => b.type === "text" && b.text)
      .map((b: { text?: string }) => b.text ?? "")
      .join("");
    const toolCalls: ToolCall[] = blocks
      .filter((b: { type?: string }) => b.type === "tool_use")
      .map((b: { id?: string; name?: string; input?: unknown }) => ({
        id: b.id ?? "",
        name: b.name ?? "",
        arguments: safeParseJson(b.input),
      }))
      .filter((c: ToolCall) => c.name);
    return { content: text, toolCalls };
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
          if (m.role === "assistant" && m.toolCalls?.length) {
            return {
              role: "assistant",
              content: normalizeTextContent(m.content) || null,
              tool_calls: m.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.arguments),
                },
              })),
            };
          }
          if (m.role === "tool") {
            return {
              role: "tool",
              tool_call_id: m.toolCallId ?? "",
              content: normalizeTextContent(m.content),
            };
          }
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
                    .map((p) => ({ type: "image_url", image_url: { url: p.dataUrl } })),
                ]
              : (m.content as string),
          };
        }),
        ...(tools.length > 0
          ? {
              tools: tools.map((t) => ({
                type: "function",
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
              tool_choice: "auto",
            }
          : {}),
        max_tokens: maxTokens,
      }),
      signal: timeoutSignal(timeoutMs),
    });
  } catch {
    throw new AIRequestError("networkError");
  }
  if (!response.ok) {
    throw new AIRequestError(mapStatus(response.status), await parseErrorBody(response));
  }
  const data = await response.json().catch(() => null);
  const message = data?.choices?.[0]?.message;
  const text = message?.content ?? "";
  const toolCalls: ToolCall[] = Array.isArray(message?.tool_calls)
    ? message.tool_calls
        .filter((tc: { type?: string; function?: { name?: string } }) => tc.function?.name)
        .map((tc: { id?: string; function?: { name?: string; arguments?: string } }) => ({
          id: tc.id ?? "",
          name: tc.function?.name ?? "",
          arguments: safeParseJson(tc.function?.arguments),
        }))
    : [];
  return { content: text, toolCalls };
}
