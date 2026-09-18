import React from "react";
import {
  FileText,
  StretchHorizontal,
  Image as ImageIcon,
  Printer,
  Braces,
  FileDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import {
  exportToPdf,
  exportToLongPagePdf,
  exportToLongPageImage,
  exportResumeAsJson,
  exportResumeAsMarkdown,
} from "@/utils/export";
import { exportResumeToBrowserPrint } from "@/utils/print";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PdfExport({ trigger }: { trigger?: React.ReactNode }) {
  const activeResume = useResumeStore((s) => s.activeResume);
  const [open, setOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  const getElement = () => document.getElementById("resume-preview");

  const handleExport = async (type: "pdf" | "longPdf" | "image" | "print") => {
    if (!activeResume) return;
    const element = getElement();
    if (!element) return;
    setPendingAction(type);
    try {
      const baseOptions = {
        elementId: "resume-preview",
        title: activeResume.title,
        pagePadding: activeResume.globalSettings.pagePadding || 32,
        fontFamily: activeResume.globalSettings.fontFamily,
      };
      switch (type) {
        case "pdf":
          await exportToBrowserPrintWithToast(element, baseOptions);
          break;
        case "longPdf":
          await exportToLongPagePdf({
            ...baseOptions,
            onStart: undefined,
            onEnd: undefined,
            successMessage: "PDF 导出成功",
            errorMessage: "PDF 导出失败",
          });
          break;
        case "image":
          await exportToLongPageImage({
            ...baseOptions,
            successMessage: "图片导出成功",
            errorMessage: "图片导出失败",
          });
          break;
        case "print":
          await exportResumeToBrowserPrint(element, baseOptions.pagePadding, baseOptions.fontFamily);
          break;
      }
    } finally {
      setPendingAction(null);
      setOpen(false);
    }
  };

  const exportToBrowserPrintWithToast = async (
    element: HTMLElement,
    options: { pagePadding: number; fontFamily?: string }
  ) => {
    try {
      await exportResumeToBrowserPrint(element, options.pagePadding, options.fontFamily);
    } catch (error) {
      console.error(error);
    }
  };

  const handleJson = () => {
    if (!activeResume) return;
    exportResumeAsJson({
      resume: activeResume,
      title: activeResume.title,
      successMessage: "JSON 导出成功",
      errorMessage: "JSON 导出失败",
    });
    setOpen(false);
  };

  const handleMarkdown = () => {
    if (!activeResume) return;
    exportResumeAsMarkdown({
      resume: activeResume,
      title: activeResume.title,
      successMessage: "Markdown 导出成功",
      errorMessage: "Markdown 导出失败",
    });
    setOpen(false);
  };

  const exportOptions = [
    {
      id: "pdf" as const,
      icon: FileText,
      title: "PDF",
      desc: "按 A4 纸张分页导出为 PDF 文件，适合投递与打印。",
    },
    {
      id: "longPdf" as const,
      icon: StretchHorizontal,
      title: "长页 PDF",
      desc: "导出为单页长图式 PDF，适合在屏幕上完整浏览。",
    },
    {
      id: "image" as const,
      icon: ImageIcon,
      title: "长页图片",
      desc: "导出为一张完整的长图片（PNG）。",
    },
    {
      id: "print" as const,
      icon: Printer,
      title: "打印",
      desc: "调起浏览器打印对话框，可选择保存为 PDF 或直接打印。",
    },
    {
      id: "json" as const,
      icon: Braces,
      title: "JSON",
      desc: "导出为 JSON 数据文件，可在其他设备导入继续编辑。",
    },
    {
      id: "markdown" as const,
      icon: FileDown,
      title: "Markdown",
      desc: "导出为 Markdown 文本，便于二次编辑与发布。",
    },
  ];

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Tooltip content="导出">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="导出">
            <FileDown className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导出简历</DialogTitle>
            <DialogDescription>选择你需要的导出格式</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {exportOptions.map((opt) => (
              <button
                key={opt.id}
                disabled={!!pendingAction}
                onClick={() => {
                  if (opt.id === "json") return handleJson();
                  if (opt.id === "markdown") return handleMarkdown();
                  handleExport(opt.id);
                }}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm",
                  pendingAction === opt.id && "opacity-60"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  {pendingAction === opt.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <opt.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                  )}
                  <span className="text-sm font-semibold">{opt.title}</span>
                </div>
                <span className="text-xs leading-relaxed text-muted-foreground">{opt.desc}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            所有导出均在本地完成，你的数据不会离开浏览器。
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
