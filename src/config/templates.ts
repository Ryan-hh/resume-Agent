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
  {
    id: "bluechip",
    name: "蓝点风格",
    description: "顶部彩条 + 居中头部，板块图标化标题，清爽现代的互联网风。",
    thumbnail: "bluechip",
    layout: "bluechip",
    category: "single",
    colorScheme: { primary: "#1FA2E6", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "classicblue",
    name: "经典蓝",
    description: "居中头部配证件照，板块标题左侧蓝色竖条，简洁专业。",
    thumbnail: "classicblue",
    layout: "classicblue",
    category: "single",
    colorScheme: { primary: "#3B82F6", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "superblue",
    name: "超级蓝",
    description: "居中头部配证件照，板块标题为蓝色实心色块标签，醒目现代。",
    thumbnail: "superblue",
    layout: "superblue",
    category: "single",
    colorScheme: { primary: "#2B7BCD", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "minimalgray",
    name: "极简灰",
    description: "居中头部配证件照，板块以整行浅灰条分隔，干净克制。",
    thumbnail: "minimalgray",
    layout: "minimalgray",
    category: "single",
    colorScheme: { primary: "#1A1A1A", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "tagblack",
    name: "标签黑",
    description: "居中头部带分隔线，板块标题为黑色实心色块标签，干练利落。",
    thumbnail: "tagblack",
    layout: "tagblack",
    category: "single",
    colorScheme: { primary: "#000000", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
  {
    id: "darktech",
    name: "深色科技",
    description: "居中头部配证件照，板块标题下方橙色整行细线，科技感强。",
    thumbnail: "darktech",
    layout: "darktech",
    category: "single",
    colorScheme: { primary: "#F97316", secondary: "#4b5563", background: "#ffffff", text: "#212529" },
    spacing: { sectionGap: 24, itemGap: 14, contentPadding: 40 },
    basic: { layout: "center" },
    availableSections: ["education", "skills", "experience", "internship", "projects", "certificates", "selfEvaluation"],
  },
];

export const DEFAULT_TEMPLATES: ResumeTemplate[] = TEMPLATES;

// 模板引用解析：简历数据里以「模板序号」存储（"0"~"N-1"，见 templateToIndex）。
// 模板列表未来可能增删——按序号解析时越界/无效统一回退到第一个模板，保证简历永远能打开；
// 同时兼容旧数据里直接存模板 id（如 "classic"）的情况。
export function getTemplateById(ref?: string | number | null): ResumeTemplate {
  if (ref !== undefined && ref !== null && ref !== "") {
    if (typeof ref === "number" && Number.isInteger(ref) && ref >= 0 && ref < TEMPLATES.length) {
      return TEMPLATES[ref];
    }
    const str = String(ref).trim();
    if (/^\d+$/.test(str)) {
      const idx = Number(str);
      if (idx >= 0 && idx < TEMPLATES.length) return TEMPLATES[idx];
    }
    const found = TEMPLATES.find((t) => t.id === str);
    if (found) return found;
  }
  return TEMPLATES[0];
}

// 模板引用 → 存储序号（字符串，如 "0"）：写入简历数据前统一走这里。
// 传模板 id（"classic"）或已有序号均可；找不到时回退 0（第一个模板）。
export function templateToIndex(ref?: string | number | null): string {
  const template = getTemplateById(ref);
  const idx = TEMPLATES.indexOf(template);
  return String(idx >= 0 ? idx : 0);
}
