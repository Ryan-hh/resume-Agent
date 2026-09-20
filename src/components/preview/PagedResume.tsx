import React from "react";
import { ResumeTemplateComponent } from "@/components/templates";
import { ResumeData } from "@/types/resume";
import { PREVIEW_WIDTH_PX, PREVIEW_HEIGHT_PX } from "./PreviewPanel";
import { collectPageBlocks, paginateBlocks, clonePageRoot } from "./pagination";

// A4 分页渲染：把简历内容按「标题块 + 条目块」测量后拆分为多个 A4 页面。
// 内容连续流动——板块内部条目可在页间断开，超出一页的内容自动流到下一页；
// 每个页面是独立的白纸（794px × 1123px），不满一页也按一页 A4 显示。
// 缩放由外层 PreviewPanel 写入的 CSS 变量 --preview-scale 驱动（宽度收窄时等比缩小，
// 保持 A4 比例，不出现横向滚动）。缩放不进入 React state：
// 面板显隐/拖拽的宽度动画期间只做纯 CSS transform（GPU 合成），不会触发分页重建。
export function PagedResume({
  resume,
  templateId,
  id,
  className,
}: {
  resume: ResumeData;
  templateId: string;
  id?: string;
  className?: string;
}) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const pagesRef = React.useRef<HTMLDivElement>(null);
  const [hostH, setHostH] = React.useState(PREVIEW_HEIGHT_PX);

  // 仅当内容/模板变化时重建分页；缩放（--preview-scale）变化不在此列
  React.useLayoutEffect(() => {
    const measure = measureRef.current;
    const target = pagesRef.current;
    if (!measure || !target) return;

    const root = measure.firstElementChild as HTMLElement | null;
    if (!root) return;

    const blocks = collectPageBlocks(root);
    if (blocks.length === 0) return;

    const cs = getComputedStyle(root);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const pageContentH = PREVIEW_HEIGHT_PX - padTop - padBottom;

    const pages = paginateBlocks(blocks, pageContentH);

    target.innerHTML = "";
    pages.forEach((page, i) => {
      const keep = new Set(page);
      const clone = clonePageRoot(root, keep);

      const pageEl = document.createElement("div");
      pageEl.style.cssText = [
        `width:${PREVIEW_WIDTH_PX}px`,
        `min-height:${PREVIEW_HEIGHT_PX}px`,
        "background:#ffffff",
        "border-radius:2px",
        "flex-shrink:0",
      ].join(";");
      pageEl.appendChild(clone);
      target.appendChild(pageEl);
    });

    // 测量未缩放的真实布局高度，用于宿主占位。
    // 不能用 getBoundingClientRect()：页面通过 transform: scale() 缩放，其返回的是
    // 受 transform 影响的视觉高度（scale<1 时被压缩），会导致宿主高度二次缩小、
    // overflow:hidden 裁掉页面底部（首次加载 scale 尚为 1 时正常，AI/编辑触发
    // 分页重建时 scale 已生效，预览随即截断）。offsetHeight 是布局高度，不受 transform 影响。
    const h = target.offsetHeight || PREVIEW_HEIGHT_PX;
    setHostH(h);
  }, [resume, templateId]);

  return (
    <>
      {/* 测量树：隐藏但保持可测量（真实布局，宽度为 A4 纸宽） */}
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
        <ResumeTemplateComponent templateId={templateId} resume={resume} />
      </div>
      {/* 缩放宿主：占位宽高随 CSS 变量等比缩小，内部页面通过 transform 缩放渲染。
          overflow hidden 阻止未缩放的子页布局尺寸向滚动容器传播（横向溢出/纵向空白） */}
      <div
        style={{
          width: `calc(${PREVIEW_WIDTH_PX}px * var(--preview-scale, 1))`,
          height: `calc(${hostH}px * var(--preview-scale, 1))`,
          overflow: "hidden",
        }}
      >
        <div
          ref={pagesRef}
          id={id}
          className={className}
          style={{ transform: "scale(var(--preview-scale, 1))", transformOrigin: "top left" }}
        />
      </div>
    </>
  );
}
