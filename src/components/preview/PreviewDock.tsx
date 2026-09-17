import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate, ArrowLeft, Github, CircleHelp, SlidersHorizontal, FilePen } from "lucide-react";
import { useTranslations } from "@/i18n/zh";
import { Tooltip } from "@/components/ui/tooltip";
import { FAQDialog } from "./FAQDialog";
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
}: {
  children: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip content={tooltip} side="left">
      <button
        onClick={onClick}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {children}
      </button>
    </Tooltip>
  );
}
