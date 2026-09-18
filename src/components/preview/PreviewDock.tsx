import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate, ArrowLeft, Github, CircleHelp, SlidersHorizontal, FilePen, Undo2, Redo2, FileDown } from "lucide-react";
import { useTranslations } from "@/i18n/zh";
import { useResumeStore } from "@/store/useResumeStore";
import { Tooltip } from "@/components/ui/tooltip";
import { FAQDialog } from "./FAQDialog";
import { PdfExport } from "@/components/shared/PdfExport";
import { LeftMode } from "@/components/editor/LeftWorkspace";
import { cn } from "@/lib/utils";

// 右侧竖排 Dock：切换左侧操作区模式（内容编辑 / 模板 / 样式）+ 返回 / GitHub / FAQ
export function PreviewDock({
  mode,
  onModeChange,
}: {
  mode: LeftMode;
  onModeChange: (m: LeftMode) => void;
}) {
  const t = useTranslations();
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
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="absolute right-4 top-1/2 z-20 -translate-y-1/2"
    >
      <div className="flex flex-col items-center gap-1 rounded-full border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur-md">
        {/* 左侧操作区模式切换 */}
        {modeButtons.map((btn) => (
          <Tooltip key={btn.key} content={btn.tooltip} side="left">
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

        <div className="my-0.5 h-px w-6 bg-border" />

        {/* 撤销 / 重做 / 导出 */}
        <DockButton tooltip="撤销 (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </DockButton>
        <DockButton tooltip="重做 (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </DockButton>
        <PdfExport
          trigger={
            <DockButton tooltip={t("previewDock.export.tooltip")}>
              <FileDown className="h-4 w-4" />
            </DockButton>
          }
        />

        <div className="my-0.5 h-px w-6 bg-border" />

        {/* 返回仪表盘 */}
        <DockButton tooltip={t("previewDock.backToDashboard")} onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </DockButton>

        {/* GitHub */}
        <DockButton
          tooltip={t("previewDock.github")}
          onClick={() => window.open("https://github.com", "_blank")}
        >
          <Github className="h-4 w-4" />
        </DockButton>

        {/* FAQ */}
        <FAQDialog
          trigger={
            <DockButton tooltip={t("previewDock.faq")}>
              <CircleHelp className="h-4 w-4" />
            </DockButton>
          }
        />
      </div>
    </motion.div>
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
