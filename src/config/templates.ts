import { ResumeTemplate } from "@/types/template";

// 4 套单列模板配置（布局/配色/间距由各模板 config 定义，渲染组件在 components/templates/ 下按 layout 注册）
export const TEMPLATES: ResumeTemplate[] = [
  {
    id: "classic",
    name: "经典模板",
    description: "传统简约的单列简历布局，信息层次清晰，适合大多数求职场景。",
    thumbnail: "classic",
    layout: "classic",
    category: "single",
    colorScheme: { primary: "#000000", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 16, itemGap: 12, contentPadding: 32 },
    basic: { layout: "left" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "minimalist",
    name: "极简模板",
    description: "大面积留白，干净纯粹的排版风格，克制而高级。",
    thumbnail: "minimalist",
    layout: "minimalist",
    category: "single",
    colorScheme: { primary: "#171717", secondary: "#737373", background: "#ffffff", text: "#171717" },
    spacing: { sectionGap: 32, itemGap: 24, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "elegant",
    name: "优雅模板",
    description: "居中标题单列设计，纤细分隔线带来高级质感。",
    thumbnail: "elegant",
    layout: "elegant",
    category: "single",
    colorScheme: { primary: "#18181b", secondary: "#71717a", background: "#ffffff", text: "#27272a" },
    spacing: { sectionGap: 28, itemGap: 18, contentPadding: 32 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "swiss",
    name: "瑞士风格",
    description: "网格化系统排版，粗体大标题，严谨利落的现代感。",
    thumbnail: "swiss",
    layout: "swiss",
    category: "single",
    colorScheme: { primary: "#111827", secondary: "#4b5563", background: "#ffffff", text: "#111827" },
    spacing: { sectionGap: 24, itemGap: 16, contentPadding: 32 },
    basic: { layout: "left" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
];

export const DEFAULT_TEMPLATES: ResumeTemplate[] = TEMPLATES;

export function getTemplateById(id?: string | null): ResumeTemplate {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
