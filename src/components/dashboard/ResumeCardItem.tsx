import React from "react";
import { FileText } from "lucide-react";
import { ResumeData } from "@/types/resume";
import { formatDateString } from "@/lib/utils";
import { getTemplateById } from "@/config/templates";
import { TemplateThumbnail } from "@/components/preview/TemplateThumbnail";

// 简历卡片：预览图铺满，信息压在预览图底部（带渐变阴影）
export function ResumeCardItem({
  resume,
  onOpen,
}: {
  resume: ResumeData;
  onOpen: () => void;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [transform, setTransform] = React.useState("scale(1)");

  const updatedAt = resume.updatedAt ? formatDateString(resume.updatedAt.split("T")[0]) : "";
  const personName = resume.basic?.name || "未命名简历";

  // 3D 波动效果：跟随鼠标位置倾斜
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // 倾斜角度上限 8 度，不会太夸张
    const rotateY = Math.max(-8, Math.min(8, ((x - centerX) / centerX) * 8));
    const rotateX = Math.max(-8, Math.min(8, -((y - centerY) / centerY) * 8));
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transition: transform ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
      className="group relative cursor-pointer select-none overflow-hidden rounded-none border border-border/70 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:border-border hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      onClick={onOpen}
    >
      {/* 预览图：真实渲染简历内容 */}
      <div className="overflow-hidden">
        <TemplateThumbnail templateId={getTemplateById(resume.templateId).id} sampleResume={resume} />
      </div>

      {/* 底部渐变阴影：托住信息文字，hover 时从下往上滑入 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] translate-y-full bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-transform duration-300 ease-out group-hover:translate-y-0" />

      {/* 信息区：压在预览图上，hover 时从下往上滑入显示 */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full p-4 text-white transition-transform duration-300 ease-out group-hover:translate-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold drop-shadow-sm">{resume.title}</div>
          </div>
          {updatedAt && (
            <span className="shrink-0 pt-0.5 text-[11px] text-white/70">更新于 {updatedAt}</span>
          )}
        </div>

        {/* 底部行：姓名 */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/25 pt-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-white/75">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{personName}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
