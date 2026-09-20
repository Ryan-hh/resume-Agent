import React from "react";
import { ResumeData } from "@/types/resume";
import CenteredHeader from "../shared/CenteredHeader";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 经典蓝：居中头部 + 左侧蓝色竖条标题（复刻自 PDF「经典蓝」）
export default function ClassicBlueTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 24;
  const themeColor = gs.themeColor || "#3B82F6";

  return (
    <div style={{ ...getContainerStyle(resume, DEFAULT_TEXT_COLOR), padding: 0 }}>
      <div style={{ padding: "28px 40px 40px 40px" }}>
        <CenteredHeader basic={resume.basic} globalSettings={gs} themeColor={themeColor} />
        <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: "8px" }}>
          {enabled
            .filter((s) => s.id !== "basic")
            .map((s) => renderSectionElement(s, resume, "default"))}
        </div>
      </div>
    </div>
  );
}
