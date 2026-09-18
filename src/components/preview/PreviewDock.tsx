import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate, ArrowLeft, Github, CircleHelp, SlidersHorizontal, FilePen, Undo2, Redo2, FileDown } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { Tooltip } from "@/components/ui/tooltip";
import { FAQDialog } from "./FAQDialog";
import { PdfExport } from "@/components/shared/PdfExport";
import { LeftMode } from "@/components/editor/LeftWorkspace";
import { cn } from "@/lib/utils";

// 竖排工具栏：位于表单板块左侧的真实布局一栏（非悬浮），
// 切换左侧操作区模式（内容编辑 / 模板 / 样式）+ 撤销重做/导出 + 返回 / GitHub / FAQ
export function PreviewDock({
  mode,
  onModeChange,
}: {
  mode: LeftMode;
  onModeChange: (m: LeftMode) => void;
}) {
  const navigate = useNavigate();
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const canUndo = useResumeStore((s) => s.canUndo());
  const canRedo = useResumeStore((s) => s.canRedo());

  const modeButtons: { key: LeftMode; icon: React.ElementType; tooltip: string }[] = [
    { key: "content", icon: FilePen, tooltip: "内容编辑" },
    { key: "template", icon: LayoutTemplate, tooltip: "切换模板" },
    { key: "style", icon: SlidersHorizontal, tooltip: "样式" },
  ];

  return (
    <div className="flex h-full shrink-0 flex-col items-center gap-1 border-r border-border bg-muted/30 p-1.5">
      {/* 左侧操作区模式切换 */}
      <div className="flex flex-col items-center gap-1">
        {modeButtons.map((btn) => (
          <Tooltip key={btn.key} content={btn.tooltip} side="right">
            <button
              onClick={() => onModeChange(btn.key)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                mode === btn.key
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <btn.icon className="h-4 w-4" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="my-1 h-px w-6 bg-border" />

      {/* 撤销 / 重做 / 导出 */}
      <div className="flex flex-col items-center gap-1">
        <DockButton tooltip="撤销 (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </DockButton>
        <DockButton tooltip="重做 (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </DockButton>
        <PdfExport
          trigger={
            <DockButton tooltip="导出">
              <FileDown className="h-4 w-4" />
            </DockButton>
          }
        />
      </div>

      <div className="my-1 h-px w-6 bg-border" />

      {/* 返回仪表盘（贴底） */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <DockButton tooltip="返回仪表盘" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </DockButton>

        {/* GitHub */}
        <DockButton
          tooltip="项目源码"
          onClick={() => window.open("https://github.com", "_blank")}
        >
          <Github className="h-4 w-4" />
        </DockButton>

        {/* FAQ */}
        <FAQDialog
          trigger={
            <DockButton tooltip="帮助">
              <CircleHelp className="h-4 w-4" />
            </DockButton>
          }
        />
      </div>
    </div>
  );
}

function DockButton({
  children,
  tooltip,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip content={tooltip} side="left">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground"
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
