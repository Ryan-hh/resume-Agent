import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Undo2, Redo2, FileText, Pencil } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { useBackupStore } from "@/store/useBackupStore";
import { useTranslations } from "@/i18n/zh";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PdfExport } from "@/components/shared/PdfExport";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function EditorHeader() {
  const t = useTranslations();
  const navigate = useNavigate();
  const activeResume = useResumeStore((s) => s.activeResume);
  const updateResumeTitle = useResumeStore((s) => s.updateResumeTitle);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const canUndo = useResumeStore((s) => s.canUndo());
  const canRedo = useResumeStore((s) => s.canRedo());

  const backupReady = useBackupStore((s) => s.isConfigured);
  const refreshBackup = useBackupStore((s) => s.refresh);
  const [titleInput, setTitleInput] = React.useState(activeResume?.title ?? "");

  React.useEffect(() => {
    setTitleInput(activeResume?.title ?? "");
  }, [activeResume?.id, activeResume?.title]);

  React.useEffect(() => {
    refreshBackup();
  }, [refreshBackup]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  const handleTitleBlur = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== activeResume?.title) {
      updateResumeTitle(trimmed);
    } else {
      setTitleInput(activeResume?.title ?? "");
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/")}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <FileText className="h-4 w-4" />
          </span>
          <span className="hidden flex-col items-start leading-tight md:flex">
            <span className="text-sm font-semibold">简历助手</span>
            <span className="text-[10px] text-muted-foreground">简历制作</span>
          </span>
        </motion.button>
        <span className="text-muted-foreground/60">/</span>
        {/* 简历名称：明显可编辑 */}
        <div className="group relative flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-9 min-w-0 max-w-[340px] items-center gap-2 rounded-lg border border-border/70 bg-background px-3 transition-all hover:border-primary/40 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="未命名简历"
              aria-label="简历名称"
            />
          </div>
        </div>
        <Tooltip
          content={
            backupReady
              ? t("previewDock.backup.configured")
              : t("previewDock.backup.notConfigured") + " · " + t("previewDock.backup.clickToConfigure")
          }
        >
          <button
            onClick={() => navigate("/settings")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
          >
            {backupReady === false ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600">{t("common.notConfigured")}</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">{t("previewDock.backup.configured")}</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip content="撤销 (Ctrl+Z)">
          <Button variant="ghost" size="icon" disabled={!canUndo} onClick={undo} aria-label="撤销">
            <Undo2 className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="重做 (Ctrl+Y)">
          <Button variant="ghost" size="icon" disabled={!canRedo} onClick={redo} aria-label="重做">
            <Redo2 className="h-4 w-4" />
          </Button>
        </Tooltip>
        <ThemeToggle />
        <PdfExport />
      </div>
    </motion.header>
  );
}
