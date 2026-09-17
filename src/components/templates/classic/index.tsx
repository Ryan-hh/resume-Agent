import React from "react";
import { ResumeData } from "@/types/resume";
import { BaseInfoSection } from "../shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 经典模板：单列、标题左侧色条
export default function ClassicTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 16;

  return (
    <div style={getContainerStyle(resume, DEFAULT_TEXT_COLOR)}>
      <BaseInfoSection basic={resume.basic} globalSettings={gs} />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {enabled
          .filter((s) => s.id !== "basic")
          .map((s) => renderSectionElement(s, resume, "default"))}
      </div>
    </div>
  );
}
