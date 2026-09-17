import React from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { PagedResume } from "./PagedResume";

export const PREVIEW_WIDTH_PX = 794; // 210mm @ 96dpi
export const PREVIEW_HEIGHT_PX = 1123; // 297mm @ 96dpi
export const PREVIEW_ELEMENT_ID = "resume-preview";

// A4 真实尺寸多页预览：每页是一张独立的 A4 纸，内容超一页自动分到下一页。
// 预览宽度收窄时整份预览等比缩小（保持 A4 比例），不出现横向滚动，可垂直滚动查看全部页。
export function PreviewPanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const templateId = activeResume?.templateId || "classic";
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  // 测量预览容器宽度 → 等比缩放比例（最多 1:1，收窄时缩小）
  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const w = node.clientWidth;
      setScale(Math.min(1, w / PREVIEW_WIDTH_PX));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!activeResume) return null;

  return (
    <div className="h-full w-full bg-[#f3f4f6]">
      <div ref={containerRef} className="preview-scroll h-full w-full overflow-x-hidden">
        <div className="flex justify-center px-6 py-6">
          <PagedResume
            resume={activeResume}
            templateId={templateId}
            id={PREVIEW_ELEMENT_ID}
            className="flex flex-col gap-4"
            scale={scale}
          />
        </div>
      </div>
    </div>
  );
}
