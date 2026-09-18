import React from "react";
import { FileText, Pencil } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { PagedResume } from "./PagedResume";

export const PREVIEW_WIDTH_PX = 794; // 210mm @ 96dpi
export const PREVIEW_HEIGHT_PX = 1123; // 297mm @ 96dpi
export const PREVIEW_ELEMENT_ID = "resume-preview";
const PREVIEW_SIDE_PADDING = 48; // 预览容器两侧 padding（px-6 × 2）

// A4 真实尺寸多页预览：每页是一张独立的 A4 纸，内容超一页自动分到下一页。
// 预览宽度收窄时整份预览等比缩小（保持 A4 比例），不出现横向滚动，可垂直滚动查看全部页。
export function PreviewPanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const updateResumeTitle = useResumeStore((s) => s.updateResumeTitle);
  const templateId = activeResume?.templateId || "classic";
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [titleInput, setTitleInput] = React.useState(activeResume?.title ?? "");

  React.useEffect(() => {
    setTitleInput(activeResume?.title ?? "");
  }, [activeResume?.id, activeResume?.title]);

  const handleTitleBlur = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== activeResume?.title) {
      updateResumeTitle(trimmed);
    } else {
      setTitleInput(activeResume?.title ?? "");
    }
  };

  // 测量预览容器宽度 → 等比缩放比例（最多 1:1，收窄时缩小）。
  // 结果直接写入 CSS 变量（--preview-scale）而非 React state：
  // 面板显隐/拖拽的宽度动画期间该变量每帧更新只触发纯 CSS transform 缩放（GPU 合成），
  // 不会引发 React 重渲染与 A4 分页重建，避免动画卡顿。
  // 依赖 activeResume 是否就绪：首次进入编辑页时容器可能尚未渲染，
  // 若挂载期注册监听会导致永不生效（预览固定 794px 并横向溢出）。
  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const w = node.clientWidth;
      if (w > 0) {
        // 用内容可用宽度（扣除两侧 padding）计算缩放，保证页面完整不被裁剪
        const scale = Math.min(1, Math.max(0, w - PREVIEW_SIDE_PADDING) / PREVIEW_WIDTH_PX);
        node.style.setProperty("--preview-scale", scale.toFixed(4));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [Boolean(activeResume)]);

  if (!activeResume) return null;

  return (
    <div className="flex h-full w-full flex-col bg-[#f3f4f6]">
      {/* 头部：简历名称（与左/右面板头部等高） */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </span>
        <div className="group relative flex h-9 min-w-0 flex-1 max-w-[420px] items-center gap-2 rounded-lg border border-border/70 bg-background px-3 transition-all hover:border-primary/40 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
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
      <div ref={containerRef} className="preview-scroll min-h-0 flex-1 overflow-x-hidden">
        <div className="flex justify-center px-6 py-6">
          <PagedResume
            resume={activeResume}
            templateId={templateId}
            id={PREVIEW_ELEMENT_ID}
            className="flex flex-col gap-4"
          />
        </div>
      </div>
    </div>
  );
}
