import React from "react";
import { ResumeData } from "@/types/resume";
import { getTemplateById } from "@/config/templates";
import { BaseInfoSection, SectionTitleVariant } from "./shared/sections";
import { renderSectionElement, getContainerStyle, DEFAULT_TEXT_COLOR } from "./shared/render";

// 统一骨架渲染器：8 套模板共用同一布局。
// 差异仅两个变量 —— avatar（头像位置：左/中/右，来自模板 basic.layout）+ variant（板块标题变体）。
// 头像用正常文档流布局（flex），内容为空时也不会与下方板块重叠。
function SkinTemplate({
  resume,
  variant,
  avatar,
}: {
  resume: ResumeData;
  variant: SectionTitleVariant;
  avatar: "left" | "center" | "right";
}) {
  const gs = resume.globalSettings;
  const enabled = resume.menuSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const gap = gs.sectionSpacing || 16;

  return (
    <div style={getContainerStyle(resume, DEFAULT_TEXT_COLOR)}>
      <BaseInfoSection basic={resume.basic} globalSettings={gs} layout={avatar} />
      <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px`, marginTop: `${gap}px` }}>
        {enabled
          .filter((s) => s.id !== "basic")
          .map((s) => renderSectionElement(s, resume, variant))}
      </div>
    </div>
  );
}

export function ResumeTemplateComponent({
  templateId,
  resume,
}: {
  templateId: string;
  resume: ResumeData;
}) {
  const template = getTemplateById(templateId);
  return (
    <SkinTemplate
      resume={resume}
      variant={template.titleVariant}
      avatar={template.basic?.layout ?? "center"}
    />
  );
}
