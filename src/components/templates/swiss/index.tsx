import React from "react";
import { ResumeData } from "@/types/resume";
import { BaseInfoSection } from "../shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 瑞士风格模板：单列，超大粗体标题 + 底部实线
export default function SwissTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 24;

  return (
    <div style={getContainerStyle(resume, DEFAULT_TEXT_COLOR)}>
      <BaseInfoSection basic={resume.basic} globalSettings={gs} />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {enabled
          .filter((s) => s.id !== "basic")
          .map((s) => renderSectionElement(s, resume, "bold"))}
      </div>
    </div>
  );
}
