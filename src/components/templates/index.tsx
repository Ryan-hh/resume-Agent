import React from "react";
import { ResumeData } from "@/types/resume";
import ClassicTemplate from "./classic";
import TimelineTemplate from "./timeline";
import MinimalistTemplate from "./minimalist";
import ElegantTemplate from "./elegant";
import SwissTemplate from "./swiss";

// 模板注册表：layout id -> 组件（仅保留单列模板）
const TEMPLATE_REGISTRY: Record<string, React.ComponentType<{ resume: ResumeData }>> = {
  classic: ClassicTemplate,
  timeline: TimelineTemplate,
  minimalist: MinimalistTemplate,
  elegant: ElegantTemplate,
  swiss: SwissTemplate,
};

export function ResumeTemplateComponent({
  templateId,
  resume,
}: {
  templateId: string;
  resume: ResumeData;
}) {
  const Template = TEMPLATE_REGISTRY[templateId] ?? ClassicTemplate;
  return <Template resume={resume} />;
}
