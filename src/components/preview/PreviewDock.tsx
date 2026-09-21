import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate, ArrowLeft, Github, CircleHelp, SlidersHorizontal, FilePen, Undo2, Redo2, FileDown, Shrink, Copy, Trash2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { Tooltip } from "@/components/ui/tooltip";
import { FAQDialog } from "./FAQDialog";
import { PdfExport } from "@/components/shared/PdfExport";
import { LeftMode } from "@/components/editor/LeftWorkspace";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const activeResume = useResumeStore((s) => s.activeResume);
  const duplicateResume = useResumeStore((s) => s.duplicateResume);
  const deleteResume = useResumeStore((s) => s.deleteResume);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const handleDuplicate = () => {
    if (!activeResume) return;
    duplicateResume(activeResume.id);
    toast.success("已复制简历");
  };

  const handleDelete = () => {
    if (!activeResume) return;
    deleteResume(activeResume);
    toast.success("已删除简历");
    navigate("/");
  };

  const modeButtons: { key: LeftMode; icon: React.ElementType; tooltip: string }[] = [
    { key: "content", icon: FilePen, tooltip: "内容编辑" },
    { key: "template", icon: LayoutTemplate, tooltip: "切换模板" },
    { key: "style", icon: SlidersHorizontal, tooltip: "样式" },
  ];

  return (
    <div className="flex h-full shrink-0 flex-col items-center gap-1 border-r border-border bg-muted/30 p-1.5">
      {/* 品牌 logo（与仪表盘侧边栏一致），点击返回仪表盘 */}
      <Tooltip content="返回仪表盘" side="right">
        <button
          onClick={() => navigate("/")}
          aria-label="返回仪表盘"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black transition-opacity hover:opacity-80 dark:bg-white"
        >
          <span className="text-base font-bold text-white dark:text-black">H</span>
        </button>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

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
        <DockButton
          tooltip="智能一页"
          onClick={() => toast.info("智能一页功能开发中，敬请期待")}
        >
          <Shrink className="h-4 w-4" />
        </DockButton>
      </div>

      <div className="my-1 h-px w-6 bg-border" />

      {/* 复制 / 删除 */}
      <div className="flex flex-col items-center gap-1">
        <DockButton tooltip="复制简历" onClick={handleDuplicate}>
          <Copy className="h-4 w-4" />
        </DockButton>
        <DockButton tooltip="删除简历" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
        </DockButton>
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

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除简历</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除简历「{activeResume?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <Tooltip content={tooltip} side="right">
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
