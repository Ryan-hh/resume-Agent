import React from "react";
import { Copy, Trash2, FileText } from "lucide-react";
import { ResumeData } from "@/types/resume";
import { useResumeStore } from "@/store/useResumeStore";
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
import { formatDateString } from "@/lib/utils";
import { TemplateThumbnail } from "@/components/preview/TemplateThumbnail";

// 简历卡片：预览图铺满，信息压在预览图底部（带渐变阴影），复制/删除按钮直接呈现
export function ResumeCardItem({
  resume,
  onOpen,
}: {
  resume: ResumeData;
  onOpen: () => void;
}) {
  const duplicateResume = useResumeStore((s) => s.duplicateResume);
  const deleteResume = useResumeStore((s) => s.deleteResume);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const updatedAt = resume.updatedAt ? formatDateString(resume.updatedAt.split("T")[0]) : "";
  const personName = resume.basic?.name || "未命名简历";

  // 复制：生成「副本」卡片，停留在当前页面
  const handleDuplicate = () => {
    duplicateResume(resume.id);
  };

  return (
    <div
      className="group relative cursor-pointer select-none overflow-hidden rounded-2xl border border-border/70 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
      onClick={onOpen}
    >
      {/* 预览图：真实渲染简历内容，hover 轻微放大 */}
      <div className="overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.04]">
        <TemplateThumbnail templateId={resume.templateId || "classic"} sampleResume={resume} />
      </div>

      {/* 底部渐变阴影：托住信息文字 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

      {/* 信息区：压在预览图上，位于块内靠下位置 */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold drop-shadow-sm">{resume.title}</div>
          </div>
          {updatedAt && (
            <span className="shrink-0 pt-0.5 text-[11px] text-white/70">更新于 {updatedAt}</span>
          )}
        </div>

        {/* 底部行：姓名 + 复制/删除小按钮 */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/25 pt-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-white/75">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{personName}</span>
          </span>
          <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={handleDuplicate}
              title="复制"
              aria-label="复制"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white/40"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              title="删除"
              aria-label="删除"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-red-500/80"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这份简历吗？</AlertDialogTitle>
            <AlertDialogDescription>「{resume.title}」</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteResume(resume)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
