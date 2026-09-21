import React from "react";
import { ResumeData } from "@/types/resume";
import { BaseInfoSection } from "../shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 优雅模板：单列居中标题 + 装饰线，衬线标题字
export default function ElegantTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 28;

  const basic = { ...resume.basic, layout: "center" as const };

  return (
    <div
      style={{
        ...getContainerStyle(resume, DEFAULT_TEXT_COLOR),
        fontFamily: gs.fontFamily || "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif",
      }}
    >
      <BaseInfoSection basic={basic} globalSettings={gs} layout="center" />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {enabled
          .filter((s) => s.id !== "basic")
          .map((s) => renderSectionElement(s, resume, "elegant"))}
      </div>
    </div>
  );
}
