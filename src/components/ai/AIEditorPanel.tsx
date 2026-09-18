import React from "react";
import { toast } from "sonner";
import { Bot, Loader2, RotateCcw, Send, Trash2, X, Wrench } from "lucide-react";
import { useResumeStore, cloneResume } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { isModelConfigured, toAIConnection } from "@/config/ai-models";
import {
  describeAgentError,
  runAgent,
  type AgentEvent,
} from "@/lib/agent/agentLoop";
import {
  AGENT_SYSTEM_PROMPT,
  createResumeAgentTools,
} from "@/lib/agent/resumeTools";
import type { ChatMessage } from "@/lib/ai-request";
import { cn } from "@/lib/utils";

interface PanelMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  status?: "running" | "done" | "error";
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeArgs(args: Record<string, unknown>): string {
  try {
    const text = JSON.stringify(args);
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  } catch {
    return "";
  }
}

function summarizeEvent(event: AgentEvent): string {
  const label: Record<string, string> = {
    get_current_resume: "读取当前简历",
    update_basic: "更新基本信息",
    upsert_section: "新增/更新经历条目",
    replace_field: "修改条目字段",
    remove_section_item: "删除条目",
    update_text_content: "更新文本板块",
  };
  const result = event.result.length > 60 ? `${event.result.slice(0, 60)}…` : event.result;
  return `${label[event.toolName] ?? event.toolName} · ${summarizeArgs(event.args)}\n→ ${result}`;
}

// 右侧 AI 助手面板（VS Code 风格第三栏）：对话式修改简历。
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
  const historyRef = React.useRef<ChatMessage[]>([]);
  const snapshotRef = React.useRef<ResumeSnapshot | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // 打开面板/切换简历时记录快照，用于「撤销本次全部改动」
  React.useEffect(() => {
    const resume = useResumeStore.getState().resumes[resumeId];
    snapshotRef.current = resume ? cloneResume(resume) : null;
    historyRef.current = [];
    setMessages([]);
  }, [resumeId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const { models, textModelId } = useAIConfigStore.getState();
    const profile = models.find((m) => m.id === textModelId);
    if (!profile || !isModelConfigured(profile)) {
      toast.error("请先在「AI 配置」中添加并启用一个模型");
      return;
    }
    const connection = toAIConnection(profile);

    setInput("");
    setBusy(true);
    const userId = uid();
    const assistantId = uid();
    setMessages((msgs) => [
      ...msgs,
      { id: userId, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "正在分析并修改简历…", status: "running" },
    ]);

    try {
      const result = await runAgent({
        connection,
        systemPrompt: AGENT_SYSTEM_PROMPT,
        userInput: text,
        tools: createResumeAgentTools(resumeId),
        history: historyRef.current,
        onEvent: (event) => {
          setMessages((msgs) => [
            ...msgs,
            {
              id: uid(),
              role: "tool",
              toolName: event.toolName,
              content: summarizeEvent(event),
            },
          ]);
        },
      });
      historyRef.current = result.messages;
      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === assistantId ? { ...m, content: result.summary, status: "done" as const } : m
        )
      );
    } catch (error) {
      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === assistantId
            ? { ...m, content: `出错：${describeAgentError(error)}`, status: "error" as const }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    historyRef.current = [];
    setMessages([]);
  };

  const handleRevert = () => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    useResumeStore.getState().updateResume(resumeId, snapshot);
    toast.success("已撤销本次会话的全部 AI 改动");
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-l border-border bg-background">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
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
            {busy ? "正在修改简历…" : "就绪"}
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
          m.role === "tool" ? (
            <div
              key={m.id}
              className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5"
            >
              <div className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                <Wrench className="h-3 w-3" />
                {m.toolName}
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                {m.content}
              </pre>
            </div>
          ) : m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div
                className={cn(
                  "max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground",
                  m.status === "running" && "flex items-center gap-2 text-muted-foreground"
                )}
              >
                {m.status === "running" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                {m.content}
              </div>
            </div>
          )
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder={busy ? "AI 正在处理…" : "输入内容或指令，Enter 发送"}
            disabled={busy}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-1 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          />
          <button
            onClick={() => void handleSend()}
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            title="发送"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          AI 修改会实时应用到简历，可 Ctrl+Z 逐步撤销
        </p>
      </div>
    </div>
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
