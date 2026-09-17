import React from "react";
import { toast } from "sonner";
import { ResumeTemplateComponent } from "@/components/templates";
import { ResumeData } from "@/types/resume";
import { PREVIEW_WIDTH_PX, PREVIEW_HEIGHT_PX } from "./PreviewPanel";
import { collectPageBlocks, paginateBlocks, clonePageRoot } from "./pagination";

// A4 分页渲染：把简历内容按「标题块 + 条目块」测量后拆分为多个 A4 页面。
// 内容连续流动——板块内部条目可在页间断开，超出一页的内容自动流到下一页；
// 每个页面是独立的白纸（794px × 1123px），不满一页也按一页 A4 显示。
// scale < 1 时整份预览等比缩小（宽度收窄时保持比例，不出现横向滚动）。
export function PagedResume({
  resume,
  templateId,
  id,
  className,
  scale = 1,
}: {
  resume: ResumeData;
  templateId: string;
  id?: string;
  className?: string;
  scale?: number;
}) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const pagesRef = React.useRef<HTMLDivElement>(null);
  const [hostH, setHostH] = React.useState(PREVIEW_HEIGHT_PX);

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
        "box-shadow:0 2px 24px rgba(0,0,0,0.12)",
        "flex-shrink:0",
      ].join(";");
      pageEl.appendChild(clone);
      target.appendChild(pageEl);

      // 页与页之间：智能一页入口（只有多页才出现，功能暂未开放）
      if (i < pages.length - 1) {
        target.appendChild(makeSmartOnePageButton());
      }
    });

    // 测量缩放后的宿主高度（等比缩小后布局占位正确）
    const h = target.getBoundingClientRect().height || PREVIEW_HEIGHT_PX;
    setHostH(h);
  }, [resume, templateId, scale]);

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
      {/* 缩放宿主：占位宽高随 scale 等比缩小，内部页面通过 transform 缩放渲染 */}
      <div style={{ width: PREVIEW_WIDTH_PX * scale, height: hostH * scale }}>
        <div
          ref={pagesRef}
          id={id}
          className={className}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </>
  );
}

// 「智能一页」入口按钮：与界面风格统一的小胶囊，功能暂未开放
function makeSmartOnePageButton(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "flex w-full flex-shrink-0 justify-center";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "my-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground";
  btn.textContent = "智能一页";
  btn.onclick = () => {
    toast.info("智能一页功能开发中，敬请期待");
  };

  wrap.appendChild(btn);
  return wrap;
}
