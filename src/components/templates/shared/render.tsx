import React from "react";
import { MenuSection, ResumeData } from "@/types/resume";
import {
  SectionTitleVariant,
  ExperienceSection,
  InternshipSection,
  EducationSection,
  ProjectSection,
  SkillSection,
  SelfEvaluationSection,
  CertificatesSection,
  CustomSection,
} from "./sections";

// 按 menuSections 渲染单个 section 元素
export function renderSectionElement(
  section: MenuSection,
  resume: ResumeData,
  titleVariant: SectionTitleVariant,
  style?: React.CSSProperties
): React.ReactNode {
  const gs = resume.globalSettings;
  switch (section.id) {
    case "skills":
      return (
        <SkillSection
          key={section.id}
          skill={resume.skillContent}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "experience":
      return (
        <ExperienceSection
          key={section.id}
          experiences={resume.experience}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "internship":
      return (
        <InternshipSection
          key={section.id}
          internships={resume.internship}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "projects":
      return (
        <ProjectSection
          key={section.id}
          projects={resume.projects}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "education":
      return (
        <EducationSection
          key={section.id}
          education={resume.education}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "selfEvaluation":
      return (
        <SelfEvaluationSection
          key={section.id}
          content={resume.selfEvaluationContent}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    case "certificates":
      return (
        <CertificatesSection
          key={section.id}
          certificatesContent={resume.certificatesContent}
          globalSettings={gs}
          titleVariant={titleVariant}
          title={section.title}
          icon={section.icon}
          style={style}
        />
      );
    default:
      if (section.id.startsWith("custom-")) {
        return (
          <CustomSection
            key={section.id}
            sectionId={section.id}
            title={section.title}
            content={resume.customData[section.id] ?? ""}
            globalSettings={gs}
            titleVariant={titleVariant}
            icon={section.icon}
            style={style}
          />
        );
      }
      return null;
  }
}

// 基础容器样式
export function getContainerStyle(resume: ResumeData, textColor: string) {
  const gs = resume.globalSettings;
  return {
    fontFamily: gs.fontFamily || "'SimHei', 'Heiti SC', sans-serif",
    fontSize: `${gs.baseFontSize || 14}px`,
    lineHeight: gs.lineHeight || 1.5,
    color: textColor,
    padding: `${gs.pagePadding || 32}px`,
    boxSizing: "border-box" as const,
    width: "100%",
    background: "white",
  };
}

export const DEFAULT_TEXT_COLOR = "#212529";
