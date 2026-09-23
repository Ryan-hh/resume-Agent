import React from "react";
import { ResumeData } from "@/types/resume";
import { ResumeTemplateComponent } from "@/components/templates";
import { PREVIEW_WIDTH_PX, PREVIEW_HEIGHT_PX } from "@/components/preview/PreviewPanel";
import { collectPageBlocks, paginateBlocks, clonePageRoot } from "@/components/preview/pagination";
import { cn } from "@/lib/utils";

// 模板缩略图：真实 A4 分页渲染，只显示简历「第一页」，按容器宽度等比缩放，超出部分裁切
export function TemplateThumbnail({
  templateId,
  sampleResume,
  className,
}: {
  templateId: string;
  sampleResume: ResumeData;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0);

  // 同步测量容器宽度 → 缩放比例（首帧即为正确缩放，避免闪现）
  React.useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / PREVIEW_WIDTH_PX);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // 渲染第一页：测量分页 → 克隆第一页块 → 缩放铺入 A4 容器
  React.useLayoutEffect(() => {
    const measure = measureRef.current;
    const node = containerRef.current;
    if (!measure || !node || !scale) return;

    const root = measure.firstElementChild as HTMLElement | null;
    if (!root) return;

    const blocks = collectPageBlocks(root);
    if (blocks.length === 0) return;

    const cs = getComputedStyle(root);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const pageContentH = PREVIEW_HEIGHT_PX - padTop - padBottom;

    const pages = paginateBlocks(blocks, pageContentH, root);
    const plan = pages[0] || { blockIds: [blocks[0].i] };
    const clone = clonePageRoot(root, plan);

    const pageEl = document.createElement("div");
    pageEl.style.cssText = [
      `width:${PREVIEW_WIDTH_PX}px`,
      `min-height:${PREVIEW_HEIGHT_PX}px`,
      "background:#ffffff",
      `transform:scale(${scale})`,
      "transform-origin:top left",
      "pointer-events:none",
    ].join(";");
    pageEl.appendChild(clone);

    node.innerHTML = "";
    node.appendChild(pageEl);
  }, [sampleResume, templateId, scale]);

  return (
    <div
      ref={containerRef}
      className={cn("select-none", className)}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "210 / 297",
        overflow: "hidden",
      }}
    >
      {/* 测量树：隐藏但可测量（真实 A4 布局） */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          left: 0,
          top: 0,
          width: PREVIEW_WIDTH_PX,
          pointerEvents: "none",
        }}
      >
        <ResumeTemplateComponent templateId={templateId} resume={sampleResume} />
      </div>
    </div>
  );
}
