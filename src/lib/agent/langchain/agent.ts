import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  AIMessageChunk,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AIConnection } from "@/config/ai-models";
import { createChatModel } from "./modelFactory";
import { buildResumeTools } from "./tools";

// ===== 分层系统提示词：角色 / 工作方式 / 数据规范 / 约束 =====
export const AGENT_SYSTEM_PROMPT = `你是嵌入在简历编辑器中的 AI 助手，任务是根据用户要求修改当前简历。所有修改都会实时应用到简历上，用户可以逐条撤销。

工作方式（严格按顺序）：
1. 首次对话或不确定现状时，先调用 get_current_resume 或 get_resume_summary 了解当前简历；如果系统提示"简历自上次对话后没有变化"，且你已掌握其结构，可以直接修改，不必重复读取。
2. 根据用户要求逐项调用修改工具（新增/更新经历条目用 upsert_section，修改单条字段用 replace_field，删除用 remove_section_item，基本信息用 update_basic / update_birth_date / update_gender，样式用 update_layout / update_global_settings / update_photo_config，板块显隐用 toggle_section_visibility 等）。
3. 全部修改完成后，用简短的中文总结你做了哪些改动；若信息不足，说明哪些内容建议用户补充，不要编造。
4. 一个工具调用失败时，根据返回的错误信息修正参数后重试，不要重复同样的错误调用。

数据格式规范：
- 所有日期统一使用 YYYY-MM 格式（如 2024-06）；"至今"用 isPresent: true。
- 性别只能取：""（不填）、"男"、"女"。
- 头部对齐：left（靠左）/ center（居中）/ right（靠右）。
- details / description 可传字符串数组或换行文本。
- 主题色、字体等样式必须使用工具描述中给出的预设值。
- 需要用户确认的模糊信息，保留原值并在总结中说明。

约束：
- 只修改用户明确要求、或能从用户文本中明确推断的内容；不要凭想象添加公司、学校、项目、时间等事实。
- 用户给的是简历素材文本时，将其拆解映射到对应板块；给的是一句话指令时，只执行该指令。
- 修改要保守：不确定的字段保留原值，并在总结中说明。
- 删除类操作（remove_section_item / remove_custom_section）先确认目标准确再执行。
- 所有回复使用中文。
- 回复正文使用 Markdown 格式，前端会渲染成富文本：适合对比或罗列结构化信息时用表格（表头加粗、首行即表头）；要点用有序/无序列表；代码、命令、JSON 用 \`\`\` 代码块；不要用 Markdown 表格以外的纯文本对齐方式拼表格。避免输出 HTML 标签（不会被渲染）。`;

// ===== Agent 构造 =====
export function createResumeAgent(connection: AIConnection, resumeId: string) {
  const model = createChatModel(connection);
  const tools = buildResumeTools(resumeId);
  return createReactAgent({
    llm: model,
    tools,
    prompt: AGENT_SYSTEM_PROMPT,
  });
}

// ===== 流式事件（供前端 UI 消费） =====
export type AgentStreamEvent =
  | { type: "token"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_start"; callId: string; name: string; input: unknown }
  | { type: "tool_end"; callId: string; name: string; output: unknown }
  | { type: "tool_error"; callId: string; name: string; error: unknown }
  | { type: "done"; messages: BaseMessage[] };

interface StreamOptions {
  signal?: AbortSignal;
  recursionLimit?: number;
}

/** 解析 .stream() 的 chunk：兼容 [mode, payload] / [ns, mode, payload] / {node: update} 三种形状 */
function parseChunk(chunk: unknown): { mode: string; payload: unknown } | null {
  if (Array.isArray(chunk) && chunk.length >= 2) {
    const mode = chunk[chunk.length - 2];
    if (typeof mode === "string") {
      return { mode, payload: chunk[chunk.length - 1] };
    }
  }
  if (chunk && typeof chunk === "object") {
    return { mode: "updates", payload: chunk };
  }
  return null;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && typeof (c as { text?: unknown }).text === "string") {
          return (c as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

/** 从模型输出中提取思考过程：OpenAI reasoning_content / Anthropic thinking / 通用 thinking 块 */
function extractThinking(message: AIMessageChunk): string {
  const kwargs = (message as unknown as { additional_kwargs?: Record<string, unknown> }).additional_kwargs ?? {};
  const direct = kwargs.reasoning_content ?? kwargs.reasoning ?? kwargs.thinking;
  if (typeof direct === "string") return direct;
  if (Array.isArray(message.content)) {
    return message.content
      .filter(
        (c) =>
          c &&
          typeof c === "object" &&
          ((c as { type?: string }).type === "thinking" || (c as { type?: string }).type === "thought")
      )
      .map((c) => String((c as { thinking?: unknown; text?: unknown }).thinking ?? (c as { text?: unknown }).text ?? ""))
      .join("");
  }
  return "";
}

export async function* streamResumeAgent(
  agent: ReturnType<typeof createResumeAgent>,
  input: { messages: BaseMessage[] },
  options: StreamOptions = {}
): AsyncGenerator<AgentStreamEvent> {
  const { signal, recursionLimit = 15 } = options;

  // 收集最终 messages：从 updates 里按节点顺序重组（agent 产出 AIMessage，tools 产出 ToolMessage）
  const collected: BaseMessage[] = [...input.messages];

  const stream = await agent.stream(
    { messages: input.messages },
    {
      streamMode: ["updates", "messages", "tools"],
      recursionLimit,
      ...(signal ? { signal } : {}),
    }
  );

  for await (const chunk of stream) {
    const parsed = parseChunk(chunk);
    if (!parsed) continue;
    const { mode, payload } = parsed;

    if (mode === "messages") {
      const pair = payload as [BaseMessage, Record<string, unknown>] | undefined;
      const message = pair?.[0];
      if (message instanceof AIMessageChunk) {
        const text = contentToText(message.content);
        if (text) yield { type: "token", text };
        const thinking = extractThinking(message);
        if (thinking) yield { type: "thinking", text: thinking };
      }
    } else if (mode === "tools") {
      const evt = payload as {
        event: string;
        name?: string;
        toolCallId?: string;
        input?: unknown;
        output?: unknown;
        error?: unknown;
      };
      const name = evt.name ?? "unknown";
      const callId = evt.toolCallId ?? name;
      if (evt.event === "on_tool_start") {
        yield { type: "tool_start", callId, name, input: evt.input };
      } else if (evt.event === "on_tool_end") {
        yield { type: "tool_end", callId, name, output: evt.output };
      } else if (evt.event === "on_tool_error") {
        yield { type: "tool_error", callId, name, error: evt.error };
      }
    } else if (mode === "updates") {
      const update = payload as Record<string, unknown>;
      for (const nodeValue of Object.values(update)) {
        if (!nodeValue || typeof nodeValue !== "object") continue;
        const record = nodeValue as Record<string, unknown>;
        // agent 节点：直接是 { messages: [AIMessage] }
        if (Array.isArray(record.messages)) {
          collected.push(...(record.messages as BaseMessage[]));
          continue;
        }
        // tools 节点：嵌套 { [callId]: { messages: [ToolMessage] } }
        for (const inner of Object.values(record)) {
          if (inner && typeof inner === "object") {
            const innerMessages = (inner as { messages?: unknown }).messages;
            if (Array.isArray(innerMessages)) {
              collected.push(...(innerMessages as BaseMessage[]));
            }
          }
        }
      }
    }
  }

  // 最终回复 = 最后一次 agent 更新的 AIMessage；tools 节点更新含 ToolMessage
  // collected 已按顺序包含全部消息（agent AI 消息 + tools 工具结果），直接作为历史
  yield { type: "done", messages: collected };
}
