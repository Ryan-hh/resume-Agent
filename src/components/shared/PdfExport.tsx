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
import { useTranslations } from "@/i18n/zh";
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
  const t = useTranslations();
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
            successMessage: t("pdfExport.toast.success"),
            errorMessage: t("pdfExport.toast.error"),
          });
          break;
        case "image":
          await exportToLongPageImage({
            ...baseOptions,
            successMessage: t("pdfExport.toast.imageSuccess"),
            errorMessage: t("pdfExport.toast.imageError"),
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
      successMessage: t("pdfExport.toast.jsonSuccess"),
      errorMessage: t("pdfExport.toast.jsonError"),
    });
    setOpen(false);
  };

  const handleMarkdown = () => {
    if (!activeResume) return;
    exportResumeAsMarkdown({
      resume: activeResume,
      title: activeResume.title,
      successMessage: t("pdfExport.toast.markdownSuccess"),
      errorMessage: t("pdfExport.toast.markdownError"),
    });
    setOpen(false);
  };

  const exportOptions = [
    {
      id: "pdf" as const,
      icon: FileText,
      title: "PDF",
      desc: t("pdfExport.modal.pdfDesc"),
    },
    {
      id: "longPdf" as const,
      icon: StretchHorizontal,
      title: "长页 PDF",
      desc: t("pdfExport.modal.longPagePdfDesc"),
    },
    {
      id: "image" as const,
      icon: ImageIcon,
      title: "长页图片",
      desc: t("pdfExport.modal.longPageImageDesc"),
    },
    {
      id: "print" as const,
      icon: Printer,
      title: "打印",
      desc: t("pdfExport.modal.printDesc"),
    },
    {
      id: "json" as const,
      icon: Braces,
      title: "JSON",
      desc: t("pdfExport.modal.jsonDesc"),
    },
    {
      id: "markdown" as const,
      icon: FileDown,
      title: "Markdown",
      desc: t("pdfExport.modal.markdownDesc"),
    },
  ];

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Tooltip content={t("previewDock.export.tooltip")}>
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="导出">
            <FileDown className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("pdfExport.modal.title")}</DialogTitle>
            <DialogDescription>{t("pdfExport.modal.subtitle")}</DialogDescription>
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
            {t("pdfExport.modal.privacyNotice")}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
