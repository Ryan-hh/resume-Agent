import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toAIConnection } from "@/config/ai-models";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { chatCompletion } from "@/lib/ai-request";

const MAX_INDENT = 6;
const INDENT_STEP_PX = 24;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      updateParagraphIndent: (delta: number) => ReturnType;
    };
    list: {
      // 转列表前先移除选区末尾的空段落，避免"不存在的空行"被加上序号
      toggleSmartList: (type: "bulletList" | "orderedList") => ReturnType;
    };
  }
}

// 列表项缩进：替换内置 listItem（保持同名，StarterKit 侧已禁用自带），
// 用 margin-left 实现缩进，使项目符号/序号与内容一起右移
const IndentListItem = ListItem.extend({
  addAttributes() {
    return {
      indent: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-indent")) || 0,
        renderHTML: (attributes) => {
          const indent = (attributes.indent as number) || 0;
          if (indent <= 0) return {};
          return {
            "data-indent": String(indent),
            style: `margin-left:${indent * INDENT_STEP_PX}px`,
          };
        },
      },
    };
  },
});

// 段落缩进扩展：替换内置 paragraph（保持同名 "paragraph"，StarterKit 侧已禁用其自带段落），
// 为段落增加缩进属性（data-indent + padding-left），Tab/Shift-Tab 或工具栏按钮触发。
// 同时处理列表项（margin-left）：列表缩进时项目符号/序号跟随移动
const IndentParagraph = Paragraph.extend({
  addCommands() {
    return {
      updateParagraphIndent:
        (delta: number) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          const step = delta > 0 ? 1 : -1;
          // 收集目标：列表项整体缩进；普通段落（不在列表内）段落缩进
          const targets: Array<{ pos: number; attrs: Record<string, unknown> }> = [];
          state.doc.nodesBetween(from, to, (node, pos, parent) => {
            if (node.type.name === "listItem") {
              targets.push({ pos, attrs: node.attrs });
            } else if (node.type.name === "paragraph" && parent?.type.name !== "listItem") {
              targets.push({ pos, attrs: node.attrs });
            }
          });
          // 从后往前应用，避免坐标偏移
          targets.sort((a, b) => b.pos - a.pos);
          let changed = false;
          for (const t of targets) {
            const current = (t.attrs.indent as number) || 0;
            const next = Math.max(0, Math.min(MAX_INDENT, current + step));
            if (next !== current) {
              tr.setNodeMarkup(t.pos, undefined, { ...t.attrs, indent: next });
              changed = true;
            }
          }
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
      toggleSmartList:
        (listType) =>
        ({ state, dispatch, chain }) => {
          // 从选区尾部向前删除末尾的空段落（<p></p>），让"空行"不进入列表
          let tr = state.tr;
          let pos = state.selection.to;
          const from = state.selection.from;
          let changed = false;
          while (pos > from) {
            const node = state.doc.nodeAt(pos - 1);
            if (node && node.type.name === "paragraph" && node.content.size === 0) {
              tr.delete(pos - 1, pos);
              pos -= 1;
              changed = true;
            } else {
              break;
            }
          }
          if (changed && dispatch) dispatch(tr);
          return chain().toggleList(listType, "listItem").run();
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.updateParagraphIndent(1),
      "Shift-Tab": () => this.editor.commands.updateParagraphIndent(-1),
    };
  },
});

// 极简富文本编辑器：加粗 / 有序列表 / 无序列表 + Tab 缩进。
// 输出 HTML 字符串，与现有简历数据格式兼容
export function RichEditor({
  value,
  onChange,
  placeholder,
  minRows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ italic: false, paragraph: false, listItem: false }),
      IndentParagraph,
      IndentListItem,
      Placeholder.configure({ placeholder: placeholder || "" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      // 即时同步：每次输入直接写入状态，右侧简历预览实时更新
      onChange(editor.getHTML());
    },    onBlur: ({ editor }) => {
      // 失焦时清理文档末尾的空块：空段落、空列表项（列表项内回车产生的空行）、空列表
      let tr = editor.state.tr;
      let changed = false;
      let guard = 0;
      while (guard++ < 100) {
        if (tr.doc.content.size <= 1) break; // 至少保留一个块节点
        // 收集所有"空块"节点位置，取最后一个删除
        const empties: Array<{ from: number; to: number }> = [];
        tr.doc.descendants((node, pos) => {
          const empty =
            (node.type.name === "paragraph" && node.content.size === 0) ||
            (node.type.name === "listItem" && node.content.size <= 1) ||
            ((node.type.name === "bulletList" || node.type.name === "orderedList") && node.content.size === 0);
          if (empty) empties.push({ from: pos, to: pos + node.nodeSize });
        });
        const last = empties[empties.length - 1];
        if (!last) break;
        tr.delete(last.from, last.to);
        changed = true;
      }
      if (changed) editor.view.dispatch(tr);
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content",
      },
    },
  });

  // AI 润色：取当前框内内容 → 用已配置的润色模型优化 → 自动填回
  const models = useAIConfigStore((s) => s.models);
  const textModelId = useAIConfigStore((s) => s.textModelId);
  const [polishing, setPolishing] = React.useState(false);

  if (!editor) return null;

  const runPolish = async () => {
    const text = editor.getText();
    if (!text.trim()) {
      toast.error("当前内容为空，暂无可润色的内容");
      return;
    }
    const profile = models.find((m) => m.id === textModelId);
    if (!profile || !profile.apiKey.trim() || !profile.model.trim()) {
      toast.error("尚未配置润色模型，请先到 AI 配置页填写 API Key 并勾选服务商");
      return;
    }
    setPolishing(true);
    try {
      const result = await chatCompletion(toAIConnection(profile), [
        {
          role: "system",
          content:
            "你是一位专业的简历润色助手。用户会给你一段简历模块的内容，请在不改变事实与结构的前提下优化表达，使语言更精炼、专业、有力；保留原有的分段、列表与要点；直接输出润色后的内容，不要任何解释或前后缀。",
        },
        { role: "user", content: text },
      ]);
      editor.commands.setContent(result, { emitUpdate: true });
      toast.success("润色完成，已更新内容");
    } catch (error) {
      let message = "润色失败，请稍后重试";
      if (error instanceof Error) {
        message = error.message || message;
      }
      toast.error(message);
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background transition-colors focus-within:border-primary/50">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/50 px-1.5 py-1">
        <ToolButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleSmartList("bulletList").run()}
          title="无序列表"
        >
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleSmartList("orderedList").run()}
          title="有序列表"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => editor.chain().focus().updateParagraphIndent(1).run()}
          title="增加缩进（向右）"
        >
          <IndentIncrease className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          active={false}
          onClick={() => editor.chain().focus().updateParagraphIndent(-1).run()}
          title="减少缩进（向左）"
        >
          <IndentDecrease className="h-3.5 w-3.5" />
        </ToolButton>
        {/* AI 润色：工具栏右侧 */}
        <button
          type="button"
          onClick={runPolish}
          disabled={polishing}
          title="使用已配置的 AI 模型润色当前内容"
          className={cn(
            "ml-auto inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-primary transition-colors",
            polishing
              ? "cursor-wait opacity-70"
              : "hover:bg-primary/10"
          )}
        >
          {polishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {polishing ? "润色中…" : "AI 润色"}
        </button>
      </div>
      {/* 内容区 */}
      <EditorContent editor={editor} className="rich-editor" />
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-muted-foreground transition-colors",
    active ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-foreground"
  );
  return (
    <button type="button" className={cls} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
