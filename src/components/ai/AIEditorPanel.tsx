import React from "react";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  Square,
  Trash2,
  Wrench,
  X,
  Brain,
} from "lucide-react";
import { useResumeStore, cloneResume } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { isModelConfigured, toAIConnection } from "@/config/ai-models";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import {
  createResumeAgent,
  streamResumeAgent,
  type AgentStreamEvent,
} from "@/lib/agent/langchain/agent";
import { describeAIError } from "@/lib/agent/langchain/errors";
import { setPhotoDirect } from "@/lib/agent/langchain/tools";
import {
  compressImageFile,
  extractTextFromDocx,
  preparePdf,
  readTextFile,
} from "@/utils/resumeImport";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ai/MarkdownContent";

interface ToolCallView {
  id: string;
  name: string;
  input: unknown;
  output: unknown;
  status: "running" | "done" | "error";
  error?: unknown;
}

interface PanelMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolCalls?: ToolCallView[];
  status?: "running" | "done" | "error" | "stopped";
  attachmentNames?: string[];
}

interface PendingAttachment {
  id: string;
  name: string;
  kind: "text" | "image";
  text?: string;
  images?: string[];
}

const MAX_REF_CHARS = 20000;
const MAX_REF_IMAGES = 3;

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

function truncateJson(value: unknown, max = 3000): string {
  const text = prettyJson(value);
  return text.length > max ? `${text.slice(0, max)}\n…（内容过长已截断）` : text;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const TOOL_LABELS: Record<string, string> = {
  get_current_resume: "读取当前简历",
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
  update_layout: "调整头部对齐",
  update_photo_config: "调整照片配置",
  update_global_settings: "调整全局样式",
};

// 右侧 AI 助手面板（VS Code 风格第三栏）：
// 基于 LangGraph 的对话式简历修改，流式输出 + 思考过程 + 工具调用卡 + 附件上传。
// 所有修改直接落到 store（自动进入撤销历史，可 Ctrl+Z 回退）。
export function AIEditorPanel({
  resumeId,
  onClose,
}: {
  resumeId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = React.useState<PanelMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [attachments, setAttachments] = React.useState<PendingAttachment[]>([]);
  const historyRef = React.useRef<BaseMessage[]>([]);
  const snapshotRef = React.useRef<ResumeSnapshot | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const resumeSigRef = React.useRef<string | null>(null);
  const agentRef = React.useRef<{ key: string; agent: ReturnType<typeof createResumeAgent> } | null>(
    null
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 打开面板/切换简历时记录快照，用于「撤销本次全部改动」
  React.useEffect(() => {
    const resume = useResumeStore.getState().resumes[resumeId];
    snapshotRef.current = resume ? cloneResume(resume) : null;
    historyRef.current = [];
    resumeSigRef.current = null;
    setMessages([]);
    setAttachments([]);
  }, [resumeId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const getAgent = (connection: ReturnType<typeof toAIConnection>, rid: string) => {
    const key = `${rid}:${connection.provider}:${connection.protocol}:${connection.model}:${connection.baseUrl}`;
    if (agentRef.current?.key === key) return agentRef.current.agent;
    const agent = createResumeAgent(connection, rid);
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
    const text = input.trim();
    if ((!text && attachments.length === 0) || busy) return;
    const { models, textModelId } = useAIConfigStore.getState();
    const profile = models.find((m) => m.id === textModelId);
    if (!profile || !isModelConfigured(profile)) {
      toast.error("请先在「AI 配置」中添加并启用一个模型");
      return;
    }
    const connection = toAIConnection(profile);
    const agent = getAgent(connection, resumeId);

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
      : "\n\n（系统提示：动手修改前请先调用 get_current_resume 读取最新简历内容。）";

    // 组装多模态消息：参考文档文本/图片 + 用户输入 + 版本提示
    type ContentBlock = { type: "text"; text: string } | { type: "image_url"; image_url: string };
    const contentBlocks: ContentBlock[] = [];
    for (const att of userAttachments) {
      if (att.kind === "text" && att.text) {
        contentBlocks.push({ type: "text", text: `【参考文档：${att.name}】\n${att.text}` });
      } else if (att.kind === "image" && att.images?.length) {
        for (const img of att.images) {
          contentBlocks.push({ type: "image_url", image_url: img });
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
      },
      { id: assistantId, role: "assistant", content: "", thinking: "", toolCalls: [], status: "running" },
    ]);

    const humanMessage = new HumanMessage({ content: contentBlocks });
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy(true);

    const applyEvent = (event: AgentStreamEvent) => {
      if (event.type === "token") {
        patchAssistant(assistantId, (m) => ({ content: m.content + event.text }));
      } else if (event.type === "thinking") {
        patchAssistant(assistantId, (m) => ({ thinking: (m.thinking ?? "") + event.text }));
      } else if (event.type === "tool_start") {
        const card: ToolCallView = {
          id: `${event.callId}-${uid()}`,
          name: event.name,
          input: event.input,
          output: undefined,
          status: "running",
        };
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls ?? []), card] } : m
          )
        );
      } else if (event.type === "tool_end") {
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((c) =>
                    c.id.startsWith(event.callId) ? { ...c, output: event.output, status: "done" as const } : c
                  ),
                }
              : m
          )
        );
      } else if (event.type === "tool_error") {
        setMessages((msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls ?? []).map((c) =>
                    c.id.startsWith(event.callId)
                      ? { ...c, error: event.error, status: "error" as const }
                      : c
                  ),
                }
              : m
          )
        );
      } else if (event.type === "done") {
        historyRef.current = event.messages;
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

  // ---- 附件 ----
  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      try {
        if (file.type.startsWith("image/")) {
          // 一寸照 → 直接设为头像（不经过模型决策）
          const dataUrl = await compressImageFile(file);
          const result = await setPhotoDirect(resumeId, dataUrl);
          const card: ToolCallView = {
            id: uid(),
            name: "set_photo",
            input: { photo: `${dataUrl.slice(0, 60)}…（已压缩上传）` },
            output: result,
            status: "done",
          };
          setMessages((msgs) => [
            ...msgs,
            { id: uid(), role: "assistant", content: "", toolCalls: [card], status: "done" },
          ]);
          toast.success(result.startsWith("错误") ? result : "已将照片设为头像");
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
  };

  const handleRevert = () => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    useResumeStore.getState().updateResume(resumeId, snapshot);
    toast.success("已撤销本次会话的全部 AI 改动");
  };

  const streaming = busy;

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      {/* 头部 */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">AI 助手</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                streaming ? "animate-pulse bg-amber-400" : "bg-emerald-500"
              )}
            />
            {streaming ? "正在处理…" : "就绪"}
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

      {/* 消息列表 */}
      <div ref={scrollRef} className="preview-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              把一段经历、一句修改指令丢给我，
              <br />
              我会直接修改这份简历。
              <br />
              例如：「我最近在字节做数据平台，
              <br />
              负责实时计算，日活 2 亿」
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground">
                {m.attachmentNames && m.attachmentNames.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {m.attachmentNames.map((n) => (
                      <span
                        key={n}
                        className="rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-[10px]"
                      >
                        📎 {n}
                      </span>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[92%] min-w-0 space-y-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2">
                {/* 思考过程 */}
                {m.thinking ? (
                  <details className="group rounded-lg border border-border/70 bg-muted/30">
                    <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      <Brain className="h-3 w-3 text-amber-500" />
                      思考过程
                      {m.status === "running" && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      )}
                    </summary>
                    <pre className="whitespace-pre-wrap break-all border-t border-border/60 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {m.thinking}
                    </pre>
                  </details>
                ) : null}

                {/* 工具调用卡 */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="space-y-1.5">
                    {m.toolCalls.map((tool) => (
                      <ToolCallCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                )}

                {/* 正文（Markdown 渲染：表格/代码块/列表等） */}
                <div className="text-[13px] leading-relaxed text-foreground">
                  {m.content ? (
                    <MarkdownContent content={m.content} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
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
                  {m.status === "running" && !m.content && (
                    <span className="ml-1 inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* 附件 + 输入区 */}
      <div className="border-t border-border p-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 py-0.5 pl-2 pr-1 text-[11px] text-muted-foreground"
              >
                {att.kind === "image" ? "🖼️" : "📄"} {att.name}
                <button
                  type="button"
                  onClick={() => setAttachments((a) => a.filter((x) => x.id !== att.id))}
                  className="flex h-4 w-4 items-center justify-center rounded hover:bg-accent hover:text-foreground"
                  title="移除附件"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary/50">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="上传参考文档（PDF / Word / TXT / JSON）或照片（设为头像）"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (busy) handleStop();
                else void handleSend();
              }
            }}
            rows={2}
            placeholder={busy ? "AI 正在处理…（Enter 停止）" : "输入内容或指令，Enter 发送"}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-1 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <button
            onClick={() => (busy ? handleStop() : void handleSend())}
            disabled={!busy && (!input.trim() && attachments.length === 0)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40",
              busy
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            title={busy ? "停止" : "发送"}
          >
            {busy ? <Square className="h-3.5 w-3.5" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          AI 修改会实时应用到简历，可 Ctrl+Z 逐步撤销；上传照片将直接设为头像
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,.png,image/png,.jpg,image/jpeg,.jpeg,image/jpeg,.webp,image/webp,.docx,.txt,text/plain,.md,text/markdown,.json,application/json"
          className="hidden"
          onChange={(e) => {
            void handleAttachFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function ToolCallCard({ tool }: { tool: ToolCallView }) {
  const running = tool.status === "running";
  const failed = tool.status === "error";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-left",
        failed ? "border-destructive/50" : running ? "border-primary/40" : "border-border/70"
      )}
    >
      <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1">
        <Wrench className={cn("h-3 w-3", failed ? "text-destructive" : running ? "text-primary" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
          {TOOL_LABELS[tool.name] ?? tool.name}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{tool.name}</span>
        {running ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            执行中
          </span>
        ) : failed ? (
          <span className="text-[10px] text-destructive">失败</span>
        ) : (
          <span className="text-[10px] text-emerald-600">完成</span>
        )}
      </div>
      <div className="space-y-1 px-2 py-1.5">
        <JsonBlock label="参数" text={truncateJson(tool.input, 1500)} />
        {!running && <JsonBlock label="结果" text={truncateJson(tool.output ?? tool.error, 1500)} />}
      </div>
    </div>
  );
}

function JsonBlock({ label, text }: { label: string; text: string }) {
  return (
    <details className="group rounded-md bg-muted/30">
      <summary className="cursor-pointer select-none px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
        {label}
      </summary>
      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all border-t border-border/50 px-1.5 py-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
        {text}
      </pre>
    </details>
  );
}

type ResumeSnapshot = ReturnType<typeof cloneResume>;

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
