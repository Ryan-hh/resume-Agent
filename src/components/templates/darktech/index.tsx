import React from "react";
import { ResumeData } from "@/types/resume";
import CenteredHeader from "../shared/CenteredHeader";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 深色科技：居中头部 + 深色粗体标题 + 橙色整行细线（复刻自 PDF「深色科技」）
export default function DarkTechTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 24;
  const themeColor = gs.themeColor || "#F97316";

  return (
    <div style={{ ...getContainerStyle(resume, DEFAULT_TEXT_COLOR), padding: 0 }}>
      <div style={{ padding: "28px 40px 40px 40px" }}>
        <CenteredHeader basic={resume.basic} globalSettings={gs} themeColor={themeColor} />
        <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: "8px" }}>
          {enabled
            .filter((s) => s.id !== "basic")
            .map((s) => renderSectionElement(s, resume, "rule"))}
        </div>
      </div>
    </div>
  );
}
