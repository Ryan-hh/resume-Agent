import React from "react";
import { ResumeData } from "@/types/resume";
import { BaseInfoSection } from "../shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 极简模板：单列居中，大留白，细线标题
export default function MinimalistTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 32;
  const themeColor = gs.themeColor || "#171717";

  const basic = { ...resume.basic, layout: "center" as const };

  return (
    <div style={getContainerStyle(resume, DEFAULT_TEXT_COLOR)}>
      <BaseInfoSection basic={basic} globalSettings={gs} />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {enabled
          .filter((s) => s.id !== "basic")
          .map((s) => renderSectionElement(s, resume, "line"))}
      </div>
    </div>
  );
}
