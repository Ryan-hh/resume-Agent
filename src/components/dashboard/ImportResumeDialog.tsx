import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileJson, FileText, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// 导入简历对话框（支持 JSON）
export function ImportResumeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const addResume = useResumeStore((s) => s.addResume);
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.basic) {
        throw new Error("invalid resume format");
      }
      // 数据迁移：补全可能缺失的字段
      const legacyData = parsed;
      const merged = {
        ...legacyData,
        menuSections: legacyData.menuSections || [],
        globalSettings: legacyData.globalSettings || {},
        customData: legacyData.customData || {},
      };
      const newId = addResume(merged);
      toast.success("简历导入成功");
      onOpenChange(false);
      navigate(`/workbench/${newId}`);
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败，请检查文件格式");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入简历</DialogTitle>
          <DialogDescription>支持导入 JSON 格式的简历文件</DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm",
            importing && "opacity-60"
          )}
        >
          <div className="flex w-full items-center justify-between">
            {importing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <FileJson className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold">JSON 文件</span>
          </div>
          <span className="text-xs leading-relaxed text-muted-foreground">
            导入此前导出的 .json 简历文件
          </span>
        </button>
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 opacity-50">
          <div className="flex w-full items-center justify-between">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-semibold">PDF 文件</span>
          </div>
          <span className="text-xs leading-relaxed text-muted-foreground">
            暂不支持 AI 解析，请使用 JSON 导入
          </span>
        </div>
        </div>
      </DialogContent>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </Dialog>
  );
}
