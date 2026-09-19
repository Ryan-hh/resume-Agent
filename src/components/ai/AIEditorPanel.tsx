import * as React from "react";
import { toast } from "sonner";
import {
  Bot,
  Paperclip,
  RotateCcw,
  Trash2,
  Square,
  X,
  Coins,
  Copy,
  RefreshCw,
  Sparkles,
  GraduationCap,
  Palette,
  Rocket,
} from "lucide-react";
import { Button, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import {
  Actions,
  Attachments,
  Bubble,
  Sender,
  ThoughtChain,
  XProvider,
  type ThoughtChainItemType,
} from "@ant-design/x";
import { useResumeStore, cloneResume } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { useAIAgentStore } from "@/store/useAIAgentStore";
import { isModelConfigured, toAIConnection } from "@/config/ai-models";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import {
  createResumeAgent,
  streamResumeAgent,
  type AgentStreamEvent,
  type AgentUsage,
} from "@/lib/agent/langchain/agent";
import { classifyToolGroups } from "@/lib/agent/langchain/intent";
import { buildResumeTools, type ToolGroup } from "@/lib/agent/langchain/tools";
import { describeAIError } from "@/lib/agent/langchain/errors";
import {
  extractTextFromDocx,
  preparePdf,
  readTextFile,
} from "@/utils/resumeImport";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ai/MarkdownContent";
import { useTheme } from "@/hooks/useTheme";

interface ToolCallView {
  id: string;
  name: string;
  input: unknown;
  output: unknown;
  status: "running" | "done" | "error";
  error?: unknown;
}

/**
 * 交错时间线：按 Agent 真实执行顺序记录「思考 → 行动 → 思考 → 行动 → …」，
 * 前端据此渲染 ReAct 循环式思维链，而不是把思考和工具各自堆成一堆。
 */
type TimelineItem =
  | { type: "thinking"; id: string; text: string }
  | ({ type: "tool" } & ToolCallView)
  /** 正文输出块：按真实到达顺序插入时间线（先输出文本 → 思考/工具 → 再输出文本），而不是全部堆在末尾 */
  | { type: "text"; id: string; text: string };

interface PanelMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  toolCalls?: ToolCallView[];
  /** 交错时间线（思考/工具按到达顺序），优先于 thinking/toolCalls 渲染 */
  timeline?: TimelineItem[];
  status?: "running" | "done" | "error" | "stopped";
  attachmentNames?: string[];
  /** 用户消息携带的附件快照（发送时拷贝，用于在气泡里展示图片缩略图 / 文档卡片） */
  attachments?: PendingAttachment[];
  /** 本次回复的 token 用量（agent 完成时写入） */
  usage?: AgentUsage;
}

interface PendingAttachment {
  id: string;
  name: string;
  kind: "text" | "image";
  text?: string;
  images?: string[];
}

/** ask_user 确认卡数据：问题 + 按钮 + 用户确认后要直接执行的写入操作 + 候选内容预览 */
interface AskCardData {
  question: string;
  options: string[];
  /** 用户确认后要直接执行的写入操作（由 ask_user 工具参数/返回带出） */
  application?: { tool: string; args: unknown };
  /** 候选内容预览（HTML 富文本或纯文本，与简历实际格式一致） */
  preview?: string;
}

const MAX_REF_CHARS = 20000;
const MAX_REF_IMAGES = 3;

// 工具名 → 中文标签
const TOOL_LABELS: Record<string, string> = {
  get_section: "读取板块",
  get_resume_summary: "读取简历摘要",
  update_basic: "更新基本信息",
  update_birth_date: "更新出生日期",
  update_gender: "更新性别",
  update_custom_field: "更新自定义字段",
  set_photo: "设置头像",
  upsert_section: "新增/更新经历条目",
  replace_field: "修改条目字段",
  remove_section_item: "删除条目",
  update_text_content: "更新文本板块",
  toggle_section_visibility: "显示/隐藏板块",
  create_custom_section: "新建自定义板块",
  remove_custom_section: "删除自定义板块",
  reorder_sections: "调整板块顺序",
  update_global_settings: "调整样式设置",
  ask_user: "询问用户",
};

// 空态建议（点击填入输入框）
const SUGGESTIONS = [
  {
    key: "polish",
    icon: <Sparkles className="h-4 w-4" />,
    label: "润色工作经历",
    description: "优化表达，让描述更专业有力",
  },
  {
    key: "edu",
    icon: <GraduationCap className="h-4 w-4" />,
    label: "补全教育背景",
    description: "整理学历信息并规范时间格式",
  },
  {
    key: "style",
    icon: <Palette className="h-4 w-4" />,
    label: "调整简历样式",
    description: "主题色、字号、行距、页边距",
  },
  {
    key: "project",
    icon: <Rocket className="h-4 w-4" />,
    label: "新增项目经历",
    description: "粘贴你的项目描述，我帮你写入",
  },
];

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 把一条助手消息转成 ThoughtChain 链条。
 * 有 timeline 时按「思考 → 工具 → 思考 → 工具」的真实执行顺序交错渲染（ReAct 循环）；
 * 没有 timeline（如面板直传照片消息）时退回旧的 thinking + 工具卡分组展示。
 * 注意：antd-x 的 ThoughtChain 在传入 status 时会用官方状态图标（loading/success/error）替换自定义 icon，
 * 因此这里不传 icon，让状态图标驱动视觉，保持链条干净统一。
 */
function buildChain(message: PanelMessage): ThoughtChainItemType[] {
  const items: ThoughtChainItemType[] = [];

  // 交错时间线：思考块在流式进行时若位于末尾则显示 loading，后续事件（工具/正文）到达后自然收起
  const timeline = message.timeline;
  if (timeline && timeline.length > 0) {
    timeline.forEach((item, idx) => {
      if (item.type === "thinking") {
        const isLast = idx === timeline.length - 1;
        const active = isLast && message.status === "running" && !message.content;
        items.push({
          key: item.id,
          title: "思考过程",
          status: active ? "loading" : "success",
          collapsible: true,
          blink: active,
          content: (
            <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {item.text}
            </pre>
          ),
        });
      } else if (item.type === "text") {
        // 正文输出块：在时间线真实位置展示（不折叠、无图标感），流式输出到末尾时显示光标
        const isLast = idx === timeline.length - 1;
        const streaming = isLast && message.status === "running";
        items.push({
          key: item.id,
          title: "回复内容",
          status: "success",
          collapsible: false,
          content: (
            <div className="px-1 text-[13px] leading-relaxed text-foreground">
              <MarkdownContent content={item.text} />
              {streaming && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/60 align-middle" />
              )}
            </div>
          ),
        });
      } else {
        const failed = item.status === "error";
        const running = item.status === "running";
        items.push({
          key: item.id,
          title: (
            <span className="inline-flex items-center gap-1.5">
              <span className="truncate">{TOOL_LABELS[item.name] ?? item.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground/60">{item.name}</span>
            </span>
          ),
          description: running ? "执行中…" : failed ? "执行失败" : "执行完成",
          status: running ? "loading" : failed ? "error" : "success",
          collapsible: true,
          blink: running,
          content: <ToolResultView tool={item} />,
        });
      }
    });
    return items;
  }

  // 兼容路径：无 timeline（面板直传的照片/工具消息）
  if (message.thinking) {
    items.push({
      key: `think-${message.id}`,
      title: "思考过程",
      status: message.status === "running" ? "loading" : "success",
      collapsible: true,
      blink: message.status === "running",
      content: (
        <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {message.thinking}
        </pre>
      ),
    });
  }
  for (const tool of message.toolCalls ?? []) {
    const failed = tool.status === "error";
    const running = tool.status === "running";
    items.push({
      key: tool.id,
      title: (
        <span className="inline-flex items-center gap-1.5">
          <span className="truncate">{TOOL_LABELS[tool.name] ?? tool.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground/60">{tool.name}</span>
        </span>
      ),
      description: running ? "执行中…" : failed ? "执行失败" : "执行完成",
      status: running ? "loading" : failed ? "error" : "success",
      collapsible: true,
      blink: running,
      content: <ToolResultView tool={tool} />,
    });
  }
  return items;
}

// 右侧 AI 助手面板（Ant Design X 组件体系）：
// Bubble.List 消息流（autoScroll 自动滚动）· ThoughtChain 思考+工具链（状态图标驱动）
// · Sender 输入（suffix 定制发送/停止 + 附件 + 粘贴文件）· Attachments 附件卡
// · Welcome + Prompts 空态 · Actions 气泡操作 · Bubble.System 系统事件
export function AIEditorPanel({
  resumeId,
  onClose,
}: {
  resumeId: string;
  onClose: () => void;
}) {
  const { theme, systemTheme } = useTheme();
  const resolvedDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  const [messages, setMessages] = React.useState<PanelMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const [busy, setBusy] = React.useState(false);
  // ask_user 工具触发的确认卡（Agent 询问是否应用结果时弹出，等用户拍板）。
  // tool_start 时先暂存到 ref，等回合真正结束（done）再弹卡，避免 busy 期间用户点击丢失
  const [askCard, setAskCard] = React.useState<AskCardData | null>(null);
  const askCardRef = React.useRef<AskCardData | null>(null);
  // ThoughtChain 展开的节点：运行中的工具自动展开，结束后自动收起
  const [expandedKeys, setExpandedKeys] = React.useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const historyRef = React.useRef<BaseMessage[]>([]);
  const snapshotRef = React.useRef<ReturnType<typeof cloneResume> | null>(null);
  const agentRef = React.useRef<{ key: string; agent: ReturnType<typeof createResumeAgent> } | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const resumeSigRef = React.useRef<string | null>(null);

  const pushSystem = (content: string) => {
    setMessages((msgs) => [...msgs, { id: uid(), role: "system", content }]);
  };

  // 打开面板/切换简历时记录快照，用于「撤销本次全部改动」
  React.useEffect(() => {
    const resume = useResumeStore.getState().resumes[resumeId];
    snapshotRef.current = resume ? cloneResume(resume) : null;
    historyRef.current = [];
    resumeSigRef.current = null;
    setMessages([]);
    setAttachments([]);
    setExpandedKeys([]);
    setAskCard(null);
    askCardRef.current = null;
  }, [resumeId]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  // 外部注入的消息（如「AI 润色」按钮）：自动发送并消费掉请求
  const pendingPrompt = useAIAgentStore((s) => s.pendingPrompt);
  const consumePrompt = useAIAgentStore((s) => s.consumePrompt);
  React.useEffect(() => {
    if (!pendingPrompt) return;
    consumePrompt();
    setAskCard(null);
    void sendText(pendingPrompt.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, consumePrompt]);

  const getAgent = (
    connection: ReturnType<typeof toAIConnection>,
    rid: string,
    groups?: ToolGroup[]
  ) => {
    const key = `${rid}:${connection.provider}:${connection.protocol}:${connection.model}:${connection.baseUrl}:${groups?.join(",") ?? "all"}`;
    if (agentRef.current?.key === key) return agentRef.current.agent;
    const agent = createResumeAgent(connection, rid, groups);
    agentRef.current = { key, agent };
    return agent;
  };

  const patchAssistant = (
    id: string,
    patch: Partial<PanelMessage> | ((m: PanelMessage) => Partial<PanelMessage>)
  ) => {
    setMessages((msgs) =>
      msgs.map((m) => {
        if (m.id !== id) return m;
        const p = typeof patch === "function" ? patch(m) : patch;
        return { ...m, ...p };
      })
    );
  };

  const handleSend = async () => {
    // 有未处理的确认卡时禁止继续提问
    if (askCard) {
      toast.info("请先处理上面的确认（应用 / 放弃）");
      return;
    }
    await sendText(input);
  };

  /** 发送任意文本（输入框发送与外部注入自动发送共用） */
  const sendText = async (rawText: string) => {
    const text = rawText.trim();
    // 必须有消息内容才能发送：只添加附件、没有文字时不允许发（附件必须配合文字指令）
    if (!text) {
      if (attachments.length > 0) toast.info("请先输入消息内容再发送");
      return;
    }
    if (busy) return;
    const { models, textModelId } = useAIConfigStore.getState();
    const profile = models.find((m) => m.id === textModelId);
    if (!profile || !isModelConfigured(profile)) {
      toast.error("请先在「AI 配置」中添加并启用一个模型");
      return;
    }
    const connection = toAIConnection(profile);
    // 动态工具注入：按用户意图只注入相关工具组（未命中时全量，由 classifyToolGroups 返回 null 兜底）
    const toolGroups = classifyToolGroups(text);
    const agent = getAgent(connection, resumeId, toolGroups ?? undefined);

    const userAttachments = attachments;
    setInput("");
    setAttachments([]);

    // 简历版本提示：内容未变则提示模型不必重复读取（省 token）
    const resume = useResumeStore.getState().resumes[resumeId];
    const sig = resume ? JSON.stringify(resume) : "";
    const unchanged = resumeSigRef.current !== null && resumeSigRef.current === sig;
    resumeSigRef.current = sig;
    const versionHint = unchanged
      ? "\n\n（系统提示：简历自上次对话后没有变化，你已掌握其结构，可直接修改，不必重复调用读取工具。）"
      : "\n\n（系统提示：动手修改前请先调用 get_resume_summary 了解结构，需要细节时再用 get_section 按板块读取。）";

    // 组装多模态消息：参考文档文本/图片 + 用户输入 + 版本提示。
    // 图片块按模型协议区分：OpenAI 兼容用 image_url；Anthropic 用 {type:image, source:{base64}}（image_url 会被 Claude API 拒绝）
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
    const toImageBlock = (dataUrl: string): ContentBlock => {
      const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
      if (profile.protocol === "anthropic" && m) {
        return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
      }
      return { type: "image_url", image_url: dataUrl };
    };
    const contentBlocks: ContentBlock[] = [];
    for (const att of userAttachments) {
      if (att.kind === "text" && att.text) {
        contentBlocks.push({ type: "text", text: `【参考文档：${att.name}】\n${att.text}` });
      } else if (att.kind === "image" && att.images?.length) {
        for (const img of att.images) {
          contentBlocks.push(toImageBlock(img));
        }
      }
    }
    contentBlocks.push({ type: "text", text: `${text}${versionHint}` });

    const userId = uid();
    const assistantId = uid();
    setMessages((msgs) => [
      ...msgs,
      {
        id: userId,
        role: "user",
        content: text,
        attachmentNames: userAttachments.map((a) => a.name),
        attachments: userAttachments,
      },
      { id: assistantId, role: "assistant", content: "", thinking: "", toolCalls: [], status: "running" },
    ]);

    const humanMessage = new HumanMessage({ content: contentBlocks });
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy(true);

    const applyEvent = (event: AgentStreamEvent) => {
      if (event.type === "token") {
        // 正文输出按真实到达顺序进入时间线（text 节点）：连续分片合并到同一条，
        // 思考/工具事件之后的输出另起一条 text——形成「输出 → 思考 → 工具 → 输出」的真实链路。
        // m.content 继续累积（用于复制/兜底），但渲染以时间线为准
        setMessages((msgs) =>
          msgs.map((m) => {
            if (m.id !== assistantId) return m;
            const timeline = m.timeline ?? [];
            const last = timeline[timeline.length - 1];
            const nextTimeline =
              last && last.type === "text"
                ? [...timeline.slice(0, -1), { ...last, text: last.text + event.text }]
                : [...timeline, { type: "text" as const, id: uid(), text: event.text }];
            return { ...m, content: m.content + event.text, timeline: nextTimeline };
          })
        );
      } else if (event.type === "thinking") {
        // 思考按到达顺序进入时间线：连续分片合并到同一条，工具/正文事件后自然成为"已完成"的思考块
        setMessages((msgs) =>
          msgs.map((m) => {
            if (m.id !== assistantId) return m;
            const timeline = m.timeline ?? [];
            const last = timeline[timeline.length - 1];
            if (last && last.type === "thinking") {
              return { ...m, timeline: [...timeline.slice(0, -1), { ...last, text: last.text + event.text }] };
            }
            return { ...m, timeline: [...timeline, { type: "thinking" as const, id: uid(), text: event.text }] };
          })
        );
      } else if (event.type === "tool_start") {
        const card: ToolCallView = {
          id: `${event.callId}-${uid()}`,
          name: event.name,
          input: event.input,
          output: undefined,
          status: "running",
        };
        setExpandedKeys((keys) => [...keys, card.id]);
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? { ...m, timeline: [...(m.timeline ?? []), { type: "tool" as const, ...card }] }
              : m
          )
        );
        // ask_user：工具参数里就有 question/options/application/preview，先暂存，回合结束（done）后必弹确认卡
        if (event.name === "ask_user") {
          const inputObj = (event.input ?? {}) as {
            question?: unknown;
            options?: unknown;
            application?: unknown;
            preview?: unknown;
          };
          const appObj =
            inputObj.application && typeof inputObj.application === "object"
              ? (inputObj.application as { tool?: unknown; args?: unknown })
              : undefined;
          askCardRef.current = {
            question:
              typeof inputObj.question === "string" ? inputObj.question : "是否将结果应用到简历？",
            options: Array.isArray(inputObj.options)
              ? inputObj.options.filter((o): o is string => typeof o === "string")
              : [],
            application:
              appObj && typeof appObj.tool === "string"
                ? { tool: appObj.tool, args: appObj.args }
                : undefined,
            preview: typeof inputObj.preview === "string" ? inputObj.preview : undefined,
          };
        }
      } else if (event.type === "tool_end") {
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  timeline: (m.timeline ?? []).map((it) =>
                    it.type === "tool" && it.id.startsWith(event.callId)
                      ? { ...it, output: event.output, status: "done" as const }
                      : it
                  ),
                }
              : m
          )
        );
        // 执行完成 → 自动收起该卡，保持列表紧凑
        setExpandedKeys((keys) => keys.filter((k) => !k.startsWith(event.callId)));
        // ask_user 询问确认：若 output 能解析出更完整的文案则覆盖（否则沿用 tool_start 暂存值）
        if (event.name === "ask_user") {
          const parsed = parseAskUserOutput(event.output);
          if (parsed) askCardRef.current = parsed;
        }
      } else if (event.type === "tool_error") {
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  timeline: (m.timeline ?? []).map((it) =>
                    it.type === "tool" && it.id.startsWith(event.callId)
                      ? { ...it, error: event.error, status: "error" as const }
                      : it
                  ),
                }
              : m
          )
        );
        setExpandedKeys((keys) => keys.filter((k) => !k.startsWith(event.callId)));
      } else if (event.type === "done") {
        historyRef.current = event.messages;
        patchAssistant(assistantId, { usage: event.usage });
        // 回合结束、busy 已解除，此时弹确认卡用户点击不会被拦截
        if (askCardRef.current) {
          setAskCard(askCardRef.current);
          askCardRef.current = null;
        }
      }
    };

    try {
      for await (const event of streamResumeAgent(
        agent,
        { messages: [...historyRef.current, humanMessage] },
        { signal: abort.signal, recursionLimit: 15 }
      )) {
        applyEvent(event);
      }
      patchAssistant(assistantId, { status: "done" });
    } catch (error) {
      const isAbort =
        error instanceof DOMException
          ? error.name === "AbortError"
          : (error as { name?: string } | null)?.name === "AbortError";
      if (isAbort) {
        patchAssistant(assistantId, (m) => ({
          status: "stopped",
          content: `${m.content}\n\n（已停止）`,
        }));
      } else {
        patchAssistant(assistantId, { status: "error", content: `出错：${describeAIError(error)}` });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const handleStop = () => abortRef.current?.abort();

  /** 用户接受 ask_user 确认：按工具参数直接执行写入（不经过 AI 二次调用）；无参数时回退为发消息让 AI 执行 */
  const handleAskAccept = async () => {
    const app = askCard?.application;
    setAskCard(null);
    if (!app?.tool) {
      await sendText("（用户已确认）请把刚才展示的结果应用到简历对应位置，不要做其他改动，完成后用简短中文总结改动。");
      return;
    }
    try {
      const tools = buildResumeTools(resumeId);
      const target = tools.find((t) => t.name === app.tool);
      if (!target) throw new Error(`找不到工具 ${app.tool}`);
      // 工具列表是联合类型，invoke 签名互不兼容；转成宽松调用形态按 args 执行
      const runner = target as unknown as { invoke: (args: unknown) => Promise<unknown> };
      const result = await runner.invoke(app.args);
      const text =
        typeof result === "string"
          ? result
          : typeof (result as { content?: unknown } | null)?.content === "string"
            ? ((result as { content: string }).content)
            : prettyJson(result);
      if (text.startsWith("错误")) {
        toast.error(text);
        pushSystem(`应用失败：${text}`);
      } else {
        toast.success("已应用，简历已更新");
        pushSystem(`已按确认应用：${text}`);
      }
    } catch (error) {
      const msg = describeAIError(error);
      toast.error(`应用失败：${msg}`);
      pushSystem("应用失败，可手动在表单中修改，或重新让 AI 润色");
    }
  };

  /** 用户拒绝 ask_user 确认：不应用、不消耗模型调用，保持简历原样 */
  const handleAskReject = () => {
    setAskCard(null);
    toast.info("已放弃，简历未做修改");
  };

  const handleAttachFiles = async (files: File[] | FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      try {
        if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
          // 已禁用图片上传：只支持文档类参考附件（PDF / Word / TXT / JSON）
          toast.info("暂不支持上传图片，仅支持 PDF / Word / TXT / JSON 文档");
          continue;
        } else if (lower.endsWith(".pdf")) {
          const prepared = await preparePdf(file);
          if (prepared.kind === "text") {
            const text = prepared.text.slice(0, MAX_REF_CHARS);
            setAttachments((a) => [...a, { id: uid(), name: file.name, kind: "text", text }]);
          } else {
            const images = prepared.images.slice(0, MAX_REF_IMAGES);
            setAttachments((a) => [...a, { id: uid(), name: file.name, kind: "image", images }]);
          }
          toast.success("已添加参考文档（发送时随消息传给 AI）");
        } else if (lower.endsWith(".docx")) {
          const text = (await extractTextFromDocx(file)).slice(0, MAX_REF_CHARS);
          setAttachments((a) => [...a, { id: uid(), name: file.name, kind: "text", text }]);
          toast.success("已添加参考文档（发送时随消息传给 AI）");
        } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
          const text = (await readTextFile(file)).slice(0, MAX_REF_CHARS);
          setAttachments((a) => [...a, { id: uid(), name: file.name, kind: "text", text }]);
          toast.success("已添加参考文档（发送时随消息传给 AI）");
        } else if (lower.endsWith(".json")) {
          const text = (await file.text()).slice(0, MAX_REF_CHARS);
          setAttachments((a) => [...a, { id: uid(), name: file.name, kind: "text", text }]);
          toast.success("已添加参考文档（发送时随消息传给 AI）");
        } else {
          toast.error("不支持该附件格式（支持：图片 / PDF / Word / TXT / JSON）");
        }
      } catch {
        toast.error(`附件「${file.name}」处理失败`);
      }
    }
  };

  const handleClear = () => {
    abortRef.current?.abort();
    historyRef.current = [];
    resumeSigRef.current = null;
    setMessages([]);
    setAttachments([]);
    setExpandedKeys([]);
    setAskCard(null);
    askCardRef.current = null;
  };

  const handleRevert = () => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    useResumeStore.getState().updateResume(resumeId, snapshot);
    pushSystem("已撤销本次会话的全部 AI 改动");
    toast.success("已撤销本次会话的全部 AI 改动");
  };

  const copyAssistantContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制回复内容");
    } catch {
      toast.error("复制失败");
    }
  };

  /** 重新生成：把该回复上一条用户指令回填到输入框（可修改后重发） */
  const regenerate = (assistantId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantId);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        setInput(messages[i].content);
        toast.info("已回填上一条指令，可修改后重新发送");
        return;
      }
    }
    toast.error("找不到对应的指令");
  };

  // 组装 Bubble.List 消息项：常规消息 + 待确认的 ask_user 确认卡（作为对话流中的一条消息）
  const bubbleItems: Parameters<typeof Bubble.List>[0]["items"] = [
    ...messages.map((m) => {
    if (m.role === "system") {
      return { key: m.id, role: "system" as const, content: m.content };
    }
    if (m.role === "user") {
      return {
        key: m.id,
        role: "user" as const,
        content: m.content,
        // 附件与文字气泡解耦：图片显示原始尺寸大图，文档用白色文件卡片，文字气泡宽度只随文字
        contentRender: (content: string) => (
          <div className="flex flex-col items-end gap-1.5">
            {m.attachments && m.attachments.length > 0 && (
              <div className="flex max-w-[85%] flex-col items-end gap-1.5">
                {m.attachments
                  .filter((att) => att.kind === "image" && att.images?.[0])
                  .map((att) => (
                    <img
                      key={att.id}
                      src={att.images![0]}
                      alt={att.name}
                      className="max-h-[300px] max-w-full rounded-xl object-contain ring-1 ring-white/20"
                    />
                  ))}
                {m.attachments.some((att) => att.kind === "text") && (
                  <div className="max-w-[380px]">
                    <Attachments
                      disabled
                      overflow="wrap"
                      items={m.attachments
                        .filter((att) => att.kind === "text")
                        .map((att) => ({
                          uid: att.id,
                          name: att.name,
                          status: "done" as const,
                          size: att.text?.length ?? 0,
                        }))}
                    />
                  </div>
                )}
              </div>
            )}
            {content && (
              <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-foreground px-3 py-2 text-[13px] leading-relaxed text-background">
                {content}
              </div>
            )}
          </div>
        ),
      };
    }
    const chainItems = buildChain(m);
    // 正文输出已按真实顺序进入时间线（text 节点）时，不再在底部重复渲染 content
    const hasInlineText = (m.timeline ?? []).some((t) => t.type === "text");
    return {
      key: m.id,
      role: "ai" as const,
      content: m.content,
      loading: m.status === "running" && !m.content && !(m.timeline?.length ?? 0),
      contentRender: () => (
        <div className="min-w-0 space-y-2">
          {chainItems.length > 0 && (
            <ThoughtChain
              items={chainItems}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys)}
              className="!m-0"
            />
          )}
          {!hasInlineText && (
          <div className="px-1 text-[13px] leading-relaxed text-foreground">
            {m.content ? (
              <MarkdownContent content={m.content} />
            ) : (
              <div className="whitespace-pre-wrap break-words text-muted-foreground/80">
                {m.status === "running"
                  ? "正在思考…"
                  : m.status === "error"
                    ? "（发生错误）"
                    : m.status === "stopped"
                      ? "（已停止）"
                      : m.toolCalls?.length
                        ? "（仅执行了工具调用，未返回文本）"
                        : "（未返回内容）"}
              </div>
            )}
            {m.status === "running" && m.content && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/60 align-middle" />
            )}
          </div>
          )}
        </div>
      ),
      footer:
        (m.usage && m.usage.total > 0) || (m.content && m.status !== "running") ? (
          <div className="space-y-1">
            {m.usage && m.usage.total > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/60">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  本次消耗
                </span>
                <span>输入 {m.usage.input.toLocaleString()}</span>
                <span>输出 {m.usage.output.toLocaleString()}</span>
                <span className="font-medium text-muted-foreground/80">
                  合计 {m.usage.total.toLocaleString()}
                </span>
                {m.usage.cacheRead > 0 && (
                  <span className="text-emerald-500/70">缓存命中 {m.usage.cacheRead.toLocaleString()}</span>
                )}
              </div>
            )}
            {m.content && m.status !== "running" && (
              <Actions
                items={[
                  { key: "copy", label: "复制", icon: <Copy className="h-3.5 w-3.5" /> },
                  { key: "regenerate", label: "重新生成", icon: <RefreshCw className="h-3.5 w-3.5" /> },
                ]}
                onClick={({ key }) => {
                  if (key === "copy") void copyAssistantContent(m.content);
                  else if (key === "regenerate") regenerate(m.id);
                }}
              />
            )}
          </div>
        ) : undefined,
    };
    }),
    // ask_user 确认卡：作为对话流最后一条消息展示（未确认前禁止继续提问）
    ...(askCard
      ? [
          {
            key: "ask-confirm-card",
            role: "ai" as const,
            content: "",
            contentRender: () => (
              <AskConfirmCard
                data={askCard}
                onAccept={() => void handleAskAccept()}
                onReject={handleAskReject}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: resolvedDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          // 主色跟随项目（中性深色 / 暗色下反转）
          colorPrimary: resolvedDark ? "#e4e4e7" : "#18181b",
          colorBgLayout: "transparent",
          borderRadius: 8,
          fontSize: 13,
        },
      }}
    >
      <XProvider>
        <div className="flex h-full w-full min-w-0 flex-col bg-background">
          {/* 头部 */}
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/90 to-primary/60">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">AI 助手</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    busy ? "animate-pulse bg-amber-400" : "bg-emerald-500"
                  )}
                />
                {busy ? "正在处理…" : "就绪"}
              </div>
            </div>
            <IconButton title="撤销本次全部改动" onClick={handleRevert}>
              <RotateCcw className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton title="清空对话" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton title="收起面板" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {/* 消息区（Bubble.List 自带滚动 + autoScroll） */}
          <div ref={scrollRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
            <div className={cn("min-h-0 flex-1", attachments.length > 0 && "pb-16")}>
              {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                    <Bot className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-[17px] font-semibold leading-snug text-foreground">我能帮你优化简历</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    说一句话，直接帮你改简历，修改实时生效
                  </p>
                </div>
                <div className="grid w-full max-w-sm grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setInput(s.label)}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {s.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">{s.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{s.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Bubble.List
                items={bubbleItems}
                role={{
                  user: {
                    placement: "end",
                    variant: "outlined",
                    shape: "corner",
                    className: "max-w-[85%]",
                    classNames: {
                      // 背景已下放到 contentRender 自绘的文字气泡；此处透明，让附件卡片宽度独立于文字气泡
                      content: "!border-0 !bg-transparent !p-0 !shadow-none",
                    },
                  },
                  ai: {
                    placement: "start",
                    variant: "outlined",
                    shape: "corner",
                    className: "max-w-[95%]",
                    classNames: {
                      content: "!rounded-2xl !border-0 !bg-transparent !p-0 !shadow-none",
                    },
                  },
                }}
                className="h-full"
              />
            )}
            </div>
            {/* 附件条：绝对定位在消息区底部（输入框上方），横向滚动展示待发送附件，
                不占用消息区/输入区布局空间；展现逻辑沿用 Attachments 卡片 */}
            {attachments.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-border/60 bg-background/95 px-3 py-2 backdrop-blur">
                <Attachments
                  items={attachments.map((a) => ({
                    uid: a.id,
                    name: a.name,
                    status: "done" as const,
                    // 图片无文本长度：按 data URL 估算字节数，避免显示 0B
                    size: a.images?.[0] ? Math.round(a.images[0].length * 0.75) : (a.text?.length ?? 0),
                    thumbUrl: a.images?.[0],
                  }))}
                  onChange={({ fileList }) =>
                    setAttachments((prev) => prev.filter((x) => fileList.some((f) => f.uid === x.id)))
                  }
                  beforeUpload={(file) => {
                    void handleAttachFiles([file]);
                    return false;
                  }}
                  overflow="scrollX"
                  // 隐藏附件条末尾的「加号」上传按钮（FileList extension）：加附件统一用输入框左侧的回形针按钮
                  styles={{ upload: { display: "none" } }}
                  accept=".pdf,application/pdf,.docx,.txt,text/plain,.md,text/markdown,.json,application/json"
                />
              </div>
            )}
          </div>

          {/* Sender 输入区（ChatGPT 风格：居中圆角容器 + 圆形附件/发送按钮） */}
          <div className="border-t border-border/70 px-3 pb-3 pt-2">
            <div className="mx-auto w-full max-w-xl">
              <Sender
                value={input}
                onChange={setInput}
                onSubmit={() => void handleSend()}
                loading={busy}
                disabled={!!askCard}
                onCancel={handleStop}
                placeholder={
                  askCard
                    ? "请先处理上面的确认（应用 / 放弃）"
                    : busy
                      ? "AI 正在处理…（点击停止按钮可中断）"
                      : "输入内容或指令，Enter 发送"
                }
                prefix={
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    title="上传参考文档（PDF / Word / TXT / JSON）"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                }
                suffix={(_, { components }) =>
                  busy ? (
                    <Button
                      type="text"
                      shape="circle"
                      onClick={handleStop}
                      title="停止生成"
                      className="!flex h-8 w-8 !items-center !justify-center text-destructive hover:!bg-destructive/10"
                    >
                      <Square className="h-3.5 w-3.5" fill="currentColor" />
                    </Button>
                  ) : (
                    // 必须渲染 antd-x 的 SendButton：它内部的 useEffect 负责同步 Sender 的 submitDisabled，
                    // 否则 Enter 提交会被拦下（回车失效）。
                    // 没有输入文字时按钮置灰不可点（即使已添加附件），而不是点击后才提示
                    <components.SendButton
                      className="!flex h-8 w-8 !items-center !justify-center rounded-full"
                      disabled={!input.trim()}
                    />
                  )
                }
                onPasteFile={(files) => void handleAttachFiles(files)}
                autoSize={{ minRows: 1, maxRows: 6 }}
                classNames={{
                  root: "overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all focus-within:border-foreground/40 focus-within:shadow-md",
                  input: "!text-[14px] !leading-relaxed",
                }}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf,.docx,.txt,text/plain,.md,text/markdown,.json,application/json"
              className="hidden"
              onChange={(e) => {
                void handleAttachFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </XProvider>
    </ConfigProvider>
  );
}

/**
 * 解析 ask_user 工具的返回：output 可能是字符串，也可能被 langgraph 包装成
 * ToolMessage / {content} 对象，统一取 content 再解析；命中 __ask_user__ 标记时
 * 返回确认卡数据（问题 + 按钮选项）；否则返回 null（不覆盖 tool_start 暂存值）。
 */
function parseAskUserOutput(output: unknown): AskCardData | null {
  let raw = output;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const content = (raw as { content?: unknown } | null)?.content;
    if (typeof content === "string") raw = content;
    else if (content !== undefined) raw = content;
  }
  if (typeof raw !== "string") return null;
  try {
    const obj = JSON.parse(raw) as {
      __ask_user__?: boolean;
      question?: unknown;
      options?: unknown;
      application?: unknown;
      preview?: unknown;
    };
    if (!obj.__ask_user__) return null;
    const question = typeof obj.question === "string" ? obj.question : "是否将结果应用到简历？";
    const options = Array.isArray(obj.options) ? obj.options.filter((o): o is string => typeof o === "string") : [];
    const appObj =
      obj.application && typeof obj.application === "object"
        ? (obj.application as { tool?: unknown; args?: unknown })
        : undefined;
    return {
      question,
      options,
      application:
        appObj && typeof appObj.tool === "string" ? { tool: appObj.tool, args: appObj.args } : undefined,
      preview: typeof obj.preview === "string" ? obj.preview : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * ask_user 确认卡：作为对话流中的一条消息渲染。
 * 候选内容按富文本（HTML）展示——加粗/序号/列表与简历中的实际格式一致；
 * 无 preview 时从 application.args 提取常见内容字段兜底。
 */
function AskConfirmCard({
  data,
  onAccept,
  onReject,
}: {
  data: AskCardData;
  onAccept: () => void;
  onReject: () => void;
}) {
  const preview = data.preview || extractPreview(data.application?.args);
  return (
    <div className="w-full max-w-xl rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
      <p className="text-[13px] font-medium text-foreground">{data.question}</p>
      {preview ? (
        <div
          className="ask-confirm-preview mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeRich(preview) }}
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="primary" size="small" onClick={onAccept}>
          应用
        </Button>
        <Button size="small" onClick={onReject}>
          放弃
        </Button>
      </div>
    </div>
  );
}

/** 基础净化：剔除 script/iframe/style 等危险标签与事件属性（候选内容来自模型输出） */
function sanitizeRich(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

/** 从 application.args 提取候选内容用于预览（preview 缺失时的兜底） */
function extractPreview(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const obj = args as Record<string, unknown>;
  for (const key of ["content", "details", "description", "text", "value"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/**
 * 工具调用结果展示：只呈现「结果 content」——字符串直接用，对象只取 content 字段，
 * 超长内容截断。不给用户堆完整 JSON/全量数据。
 */
function ToolResultView({ tool }: { tool: ToolCallView }) {
  if (tool.status === "running") {
    return <div className="text-[11px] text-muted-foreground/70">执行中…</div>;
  }
  // ask_user 的原始返回是内部标记 JSON，不展示给用户；确认卡已在消息流下方单独渲染
  if (tool.name === "ask_user") {
    return <div className="text-[11px] text-primary/80">已向用户发起确认，等待答复…</div>;
  }
  const raw = tool.status === "error" ? tool.error : tool.output;
  if (raw === undefined || raw === null) {
    return <div className="text-[11px] text-muted-foreground/70">（无返回）</div>;
  }
  // 只取 content：字符串即 content；对象优先取 content 字段，其余结构不作为展示内容
  let text: string;
  if (typeof raw === "string") {
    text = raw;
  } else if (typeof raw === "object") {
    const content = (raw as { content?: unknown } | null)?.content;
    if (typeof content === "string") {
      text = content;
    } else if (content !== undefined && content !== null) {
      text = prettyJson(content);
    } else {
      text = prettyJson(raw);
    }
  } else {
    text = String(raw);
  }
  // context 展示：超长截断，避免全量数据堆在消息里
  const MAX_LEN = 500;
  const shown = text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}\n…（内容过长，仅展示前 ${MAX_LEN} 字）` : text;
  return (
    <div className="max-h-44 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
      {shown}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
