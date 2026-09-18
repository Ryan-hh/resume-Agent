import type { AIConnection } from "@/config/ai-models";
import {
  AIRequestError,
  chatCompletionWithTools,
  type ChatMessage,
  type ToolDefinition,
} from "@/lib/ai-request";

// 纯前端 Agent 引擎：自己管理上下文 + 循环调用工具，直到模型不再请求工具。
// 协议无关：底层 chatCompletionWithTools 负责翻译 OpenAI / Gemini / Anthropic。

export interface AgentTool extends ToolDefinition {
  execute: (args: Record<string, unknown>) => Promise<string> | string;
}

export interface AgentEvent {
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  /** 当前是第几步（从 0 开始） */
  step: number;
}

export interface AgentResult {
  /** 完整对话历史（含 system），可直接作为下一轮 history 传入 */
  messages: ChatMessage[];
  /** 模型最终总结（无工具调用时的那段内容） */
  summary: string;
  /** 实际执行的循环步数 */
  steps: number;
}

export interface RunAgentOptions {
  connection: AIConnection;
  systemPrompt: string;
  userInput: string;
  tools: AgentTool[];
  /** 前几轮的完整历史（由上一次 runAgent 返回的 messages 传入） */
  history?: ChatMessage[];
  maxSteps?: number;
  timeoutMs?: number;
  /** 每次工具调用完成后回调（供 UI 显示动作流） */
  onEvent?: (event: AgentEvent) => void;
}

const DEFAULT_MAX_STEPS = 12;
const DEFAULT_TIMEOUT_MS = 180_000;

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const {
    connection,
    systemPrompt,
    userInput,
    tools,
    history = [],
    maxSteps = DEFAULT_MAX_STEPS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onEvent,
  } = options;

  const messages: ChatMessage[] = [
    ...history.filter((m) => m.role !== "system"),
    { role: "system", content: systemPrompt },
    { role: "user", content: userInput },
  ];
  const definitions: ToolDefinition[] = tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));

  let step = 0;
  for (; step < maxSteps; step += 1) {
    const response = await chatCompletionWithTools(
      connection,
      messages,
      definitions,
      4096,
      timeoutMs
    );

    if (response.toolCalls.length === 0) {
      messages.push({ role: "assistant", content: response.content });
      return { messages, summary: response.content, steps: step + 1 };
    }

    messages.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls,
    });

    for (const call of response.toolCalls) {
      const tool = tools.find((t) => t.name === call.name);
      let result: string;
      if (!tool) {
        result = `错误：未知工具 ${call.name}`;
      } else {
        try {
          result = await tool.execute(call.arguments);
        } catch (error) {
          result = `错误：${error instanceof Error ? error.message : String(error)}`;
        }
      }
      messages.push({
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
        content: result,
      });
      onEvent?.({ toolName: call.name, args: call.arguments, result, step });
    }
  }

  const finalNote = `已达到本轮操作步数上限（${maxSteps} 步），请检查当前改动是否符合预期，可继续提出要求。`;
  messages.push({ role: "assistant", content: finalNote });
  return { messages, summary: finalNote, steps: step };
}

export function describeAgentError(error: unknown): string {
  if (error instanceof AIRequestError) {
    switch (error.code) {
      case "networkError":
        return "网络请求失败，请检查网络后重试";
      case "timeout":
        return "AI 响应超时，请重试";
      case "unauthorized":
        return "API Key 无效或没有权限，请检查 AI 配置";
      case "modelNotFound":
        return "模型不存在，请在 AI 配置中检查模型 ID";
      case "badRequest":
        return "请求被拒绝，请确认所选模型支持工具调用（function calling）";
      case "upstreamError":
        return "AI 服务返回异常，请重试";
      default:
        return "AI 请求失败，请重试";
    }
  }
  return "操作失败，请重试";
}
