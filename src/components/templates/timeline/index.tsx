import React from "react";
import { ResumeData } from "@/types/resume";
import { BaseInfoSection } from "../shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "../shared/render";

// 时间线模板：单列，左侧时间轴竖线贯穿经历/项目/教育
export default function TimelineTemplate({ resume }: { resume: ResumeData }) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 24;
  const themeColor = gs.themeColor || "#0f172a";

  const timelineSections = enabled.filter((s) =>
    ["experience", "projects", "education"].includes(s.id)
  );
  const otherSections = enabled.filter(
    (s) => !["basic", "experience", "projects", "education"].includes(s.id)
  );

  return (
    <div style={getContainerStyle(resume, DEFAULT_TEXT_COLOR)}>
      <BaseInfoSection basic={resume.basic} globalSettings={gs} layout="left" />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {otherSections.map((s) => renderSectionElement(s, resume, "icon"))}

        {timelineSections.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
            {timelineSections.map((s) => (
              <div key={s.id}>
                {renderSectionElement(s, resume, "icon")}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
