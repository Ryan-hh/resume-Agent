import { ResumeData } from "@/types/resume";
import { formatDateRange, formatDateString } from "@/lib/utils";

export interface ResumeMarkdownOptions {
  basicFieldLabels?: Record<string, string>;
}

const htmlToText = (html: string): string => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  const lists = div.querySelectorAll("ul, ol");
  lists.forEach((list) => {
    list.querySelectorAll("li").forEach((li) => {
      li.textContent = `- ${li.textContent}`;
    });
  });
  const text = div.textContent || "";
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
};

export const generateResumeMarkdown = (
  resume: ResumeData,
  options?: ResumeMarkdownOptions
): string => {
  const lines: string[] = [];
  const labels = options?.basicFieldLabels ?? {};
  const { basic, education, experience, internship, projects, skillContent, selfEvaluationContent, certificatesContent, menuSections } = resume;

  lines.push(`# ${basic.name || ""}`);
  lines.push("");

  if (basic.title) lines.push(`**${basic.title}**  `);
  if (basic.employementStatus) lines.push(`${labels.employementStatus || "状态"}：${basic.employementStatus}  `);
  if (basic.email) lines.push(`${labels.email || "邮箱"}：${basic.email}  `);
  if (basic.phone) lines.push(`${labels.phone || "电话"}：${basic.phone}  `);
  if (basic.location) lines.push(`${labels.location || "所在地"}：${basic.location}  `);
  lines.push("");

  const sectionEnabled = (id: string) => menuSections.find((s) => s.id === id)?.enabled;

  if (sectionEnabled("education") && education.length > 0) {
    lines.push("## 教育背景");
    education.forEach((e) => {
      lines.push(`### ${e.school || ""}${e.major ? ` · ${e.major}` : ""}`);
      const range = [e.startDate, e.endDate].filter(Boolean).join(" - ");
      if (range) lines.push(`${range}`);
      if (e.degree) lines.push(`${e.degree}${e.gpa ? ` · GPA ${e.gpa}` : ""}`);
      if (e.description) {
        lines.push("");
        lines.push(htmlToText(e.description));
      }
      lines.push("");
    });
  }

  if (sectionEnabled("experience") && experience.length > 0) {
    lines.push("## 工作经历");
    experience.forEach((e) => {
      lines.push(`### ${e.company || ""}${e.position ? ` · ${e.position}` : ""}`);
      const range = formatDateRange(e.startDate, e.endDate, e.isPresent);
      if (range) lines.push(range);
      if (e.details) {
        lines.push("");
        lines.push(htmlToText(e.details));
      }
      lines.push("");
    });
  }

  if (sectionEnabled("internship") && internship.length > 0) {
    lines.push("## 实习经历");
    internship.forEach((e) => {
      lines.push(`### ${e.company || ""}${e.position ? ` · ${e.position}` : ""}`);
      const range = formatDateRange(e.startDate, e.endDate, e.isPresent);
      if (range) lines.push(range);
      if (e.details) {
        lines.push("");
        lines.push(htmlToText(e.details));
      }
      lines.push("");
    });
  }

  if (sectionEnabled("projects") && projects.length > 0) {
    lines.push("## 项目经历");
    projects.forEach((p) => {
      lines.push(`### ${p.name || ""}${p.role ? ` · ${p.role}` : ""}`);
      const range = formatDateRange(p.startDate, p.endDate, p.isPresent);
      if (range) lines.push(range);
      if (p.description) {
        lines.push("");
        lines.push(htmlToText(p.description));
      }
      lines.push("");
    });
  }

  if (sectionEnabled("skills") && skillContent) {
    lines.push("## 专业技能");
    lines.push(htmlToText(skillContent));
    lines.push("");
  }

  if (sectionEnabled("selfEvaluation") && selfEvaluationContent) {
    lines.push("## 自我评价");
    lines.push(htmlToText(selfEvaluationContent));
    lines.push("");
  }

  if (sectionEnabled("certificates") && certificatesContent.trim()) {
    lines.push("## 荣誉证书");
    lines.push(htmlToText(certificatesContent));
    lines.push("");
  }

  return lines.join("\n");
};
