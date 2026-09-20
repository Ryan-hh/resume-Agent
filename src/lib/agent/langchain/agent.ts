import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  AIMessageChunk,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AIConnection } from "@/config/ai-models";
import { createChatModel } from "./modelFactory";
import { buildResumeTools, type ToolGroup } from "./tools";

// ===== 分层系统提示词：角色 / 工作方式 / 数据规范 / 约束 =====
export const AGENT_SYSTEM_PROMPT = `你是「智能小昊」，嵌入在简历编辑器中的 AI 助手。你的名字是智能小昊（“昊”由日和天组成），要始终认同这个身份：自我介绍或被问起是谁时，直接说自己是智能小昊，不要自称“AI 助手”“AI”或其他名字。你的任务是根据用户要求修改当前简历。所有修改都会实时应用到简历上，用户可以逐条撤销。

工作方式（严格按顺序）：
1. 首次对话或不确定现状时，先调用 get_resume_summary 了解整体结构；需要某个板块的具体内容时，用 get_section 只读取对应板块（改哪个板块就读哪个，不要一次读多个，更不要读全部）。如果系统提示"简历自上次对话后没有变化"，且你已掌握其结构，可以直接修改，不必重复读取。
2. 根据用户要求逐项调用修改工具（新增/更新经历条目用 upsert_section，修改单条字段用 replace_field，删除用 remove_section_item，基本信息用 update_basic / update_birth_date / update_gender，样式（布局/照片/主题/字号等）用 update_global_settings，板块显隐用 toggle_section_visibility 等）。以你当前可用的工具列表为准，只调用列表里存在的工具，调用列表之外的工具会失败。
3. 全部修改完成后，用简短的中文总结你做了哪些改动；若信息不足，说明哪些内容建议用户补充，不要编造。
4. 一个工具调用失败时，根据返回的错误信息修正参数后重试，不要重复同样的错误调用。
5. 只有在润色/文本改写场景才使用 ask_user 工具：润色完成后调用它询问用户是否应用结果（调用时必须在 application 字段给出用户确认后要执行的写入操作，preview 字段给出候选内容）。其他所有操作（修改、删除、新增、样式调整等）一律直接调用对应工具执行，禁止用 ask_user 询问用户。

数据格式规范：
- 所有日期统一使用 YYYY-MM 格式（如 2024-06）；"至今"用 isPresent: true。
- 性别只能取：""（不填）、"男"、"女"。
- 头部对齐：left（靠左）/ center（居中）/ right（靠右）。
- details / description 可传字符串数组或换行文本。
- 主题色、字体等样式必须使用工具描述中给出的预设值。
- 需要用户确认的模糊信息，保留原值并在总结中说明。

附件与图片处理：
- 用户可能上传附件：图片、PDF、Word、TXT、JSON，内容会随消息一起提供给你（图片以 image_url 形式出现）。
- 用户上传图片时，按用户的指令判断用途，不要默认当成头像：
  ① 明确说「设置/更换头像」「把这张图作为头像」→ 调用 set_photo 设置头像（photo 直接用对话中该图片的 data URL，原样传入）。
  ② 说「按图片/根据这张简历填写/填充/完善简历」→ 从图片中提取可辨认的信息（姓名、电话、邮箱、教育、工作、技能等），用对应工具写入各板块；图片上看不清或没有的字段不要编造，在总结中说明哪些是提取出来的、哪些缺失。
  ③ 只上传图片、没有任何指令 → 解析图片内容，向用户说明识别到了什么；若图片中没有可识别的文字或简历信息，如实说明「未从图片中识别到内容」，不要编造。
- 参考文档（PDF/Word/TXT/JSON）作为素材按用户指令使用，同样不得编造文档中不存在的内容。

约束：
- 只修改用户明确要求、或能从用户文本中明确推断的内容；不要凭想象添加公司、学校、项目、时间等事实。
- 用户给的是简历素材文本时，将其拆解映射到对应板块；给的是一句话指令时，只执行该指令。
- 修改要保守：不确定的字段保留原值，并在总结中说明。
- 删除类操作（remove_section_item / remove_custom_section）先确认目标准确再执行。
- 所有回复使用中文。

回复风格（严格遵守）：
- 简洁，不废话。总结改动用要点列表，最多 3-5 行；执行了多少处改动就列多少条，不逐条复述简历原有内容。
- 禁止开场白与客套（如"好的""没问题""很高兴为您服务""如需帮助请随时告诉我"），直接进入正题；没有改动时用一句话说明原因即可。
- 信息不足时，仅列出缺失的字段名，不展开长篇建议。
- 需要向用户展示对比、数据或结构化信息时才用表格或列表；一句话能说清的内容不要用表格。

回复正文使用 Markdown 格式，前端会渲染成富文本：适合对比或罗列结构化信息时用表格（表头加粗、首行即表头）；要点用有序/无序列表；代码、命令、JSON 用 \`\`\` 代码块；不要用 Markdown 表格以外的纯文本对齐方式拼表格。避免输出 HTML 标签（不会被渲染）。`;

// ===== Agent 构造 =====
export function createResumeAgent(connection: AIConnection, resumeId: string, groups?: ToolGroup[]) {
  const model = createChatModel(connection);
  const tools = buildResumeTools(resumeId, groups);
  return createReactAgent({
    llm: model,
    tools,
    prompt: AGENT_SYSTEM_PROMPT,
  });
}

// ===== 流式事件（供前端 UI 消费） =====
/** 一次回复（含所有 LLM 调用）的 token 用量；拿不到时字段为 0 */
export interface AgentUsage {
  /** 输入 token（system + 工具定义 + 历史 + 工具结果） */
  input: number;
  /** 输出 token（回复 + 工具调用参数） */
  output: number;
  /** 总计 */
  total: number;
  /** 命中的缓存输入 token（OpenAI/Anthropic prompt caching） */
  cacheRead: number;
}

export type AgentStreamEvent =
  | { type: "token"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_start"; callId: string; name: string; input: unknown }
  | { type: "tool_end"; callId: string; name: string; output: unknown }
  | { type: "tool_error"; callId: string; name: string; error: unknown }
  | { type: "done"; messages: BaseMessage[]; usage: AgentUsage };

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

/** 从模型输出中提取思考过程：OpenAI reasoning_content / Anthropic thinking / 通用 thinking·reasoning·thought 块 */
function extractThinking(message: AIMessageChunk): string {
  const kwargs = (message as unknown as { additional_kwargs?: Record<string, unknown> }).additional_kwargs ?? {};
  const direct = kwargs.reasoning_content ?? kwargs.reasoning ?? kwargs.thinking;
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct)) {
    // 个别实现把 reasoning 拆成数组（字符串或 {text}/{content} 块）
    return direct
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const b = d as { text?: unknown; content?: unknown };
          return typeof b.text === "string" ? b.text : typeof b.content === "string" ? b.content : "";
        }
        return "";
      })
      .join("");
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter(
        (c) =>
          c &&
          typeof c === "object" &&
          (["thinking", "thought", "reasoning"].includes((c as { type?: string }).type ?? ""))
      )
      .map((c) => {
        const block = c as { thinking?: unknown; reasoning?: unknown; text?: unknown; content?: unknown };
        const raw = block.thinking ?? block.reasoning ?? block.text ?? block.content;
        return typeof raw === "string" ? raw : "";
      })
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

  // token 用量：流式下每个 LLM 调用的最后一个 chunk 带完整 usage_metadata（天然无重复）
  const usage: AgentUsage = { input: 0, output: 0, total: 0, cacheRead: 0 };
  const collectUsage = (chunk: AIMessageChunk) => {
    const um = (chunk as unknown as { usage_metadata?: Record<string, number> }).usage_metadata;
    if (!um || typeof um !== "object") return;
    usage.input += um.input_tokens ?? 0;
    usage.output += um.output_tokens ?? 0;
    usage.total += um.total_tokens ?? 0;
    // 缓存命中：Anthropic 顶层 cache_read_input_tokens / OpenAI input_token_details.cache_read
    const details = (um as { input_token_details?: { cache_read?: number } }).input_token_details;
    usage.cacheRead += um.cache_read_input_tokens ?? details?.cache_read ?? 0;
  };

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
        // 流式下 usage 只在每个 LLM 调用的最后一个 chunk 上出现（OpenAI/Anthropic/Gemini 均如此）
        collectUsage(message);
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
  yield { type: "done", messages: collected, usage };
}
