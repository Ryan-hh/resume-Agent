// 简历数据模型（结构对齐 magic-resume，保证功能等价）

export interface PhotoConfig {
  borderRadius: "none" | "medium" | "full";
  visible?: boolean;
}

export const DEFAULT_CONFIG: PhotoConfig = {
  borderRadius: "none",
  visible: true,
};

// 头像圆角选项
export const PHOTO_RADIUS_OPTIONS: { value: PhotoConfig["borderRadius"]; label: string; radius: number }[] = [
  { value: "none", label: "直角", radius: 0 },
  { value: "medium", label: "圆角", radius: 10 },
  { value: "full", label: "圆形", radius: 9999 },
];

export const getPhotoRadius = (c?: PhotoConfig): number =>
  PHOTO_RADIUS_OPTIONS.find((o) => o.value === c?.borderRadius)?.radius ?? 0;

export interface BasicFieldType {
  id: string;
  key: keyof BasicInfo;
  label: string;
  type?: "date" | "textarea" | "text" | "editor";
  visible: boolean;
  custom?: boolean;
}

export interface CustomFieldType {
  id: string;
  label: string;
  value: string;
  icon?: string;
  visible?: boolean;
  custom?: boolean;
  displayLabel?: boolean;
}

export interface BasicInfo {
  birthDate: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  icons: Record<string, string>;
  photo: string;
  photoConfig: PhotoConfig;
  fieldOrder?: BasicFieldType[];
  customFields: CustomFieldType[];
  // 个人信息扩展字段（固定顺序展示）
  gender?: string; // 性别：男 / 女
  jobIntention?: string; // 求职意向（目标岗位）
  politicalStatus?: string; // 政治面貌
  showAge?: boolean; // 出生日期旁：勾选后简历上在年月日基础上
}

export interface Education {
  id: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  description?: string;
  visible?: boolean;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isPresent?: boolean; // 至今：勾选后隐藏结束时间
  details: string;
  visible?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  isPresent?: boolean; // 至今：勾选后隐藏结束时间
  description: string;
  visible: boolean;
}

export type GlobalSettings = {
  themeColor?: string | undefined;
  fontFamily?: string | undefined;
  baseFontSize?: number | undefined;
  pagePadding?: number | undefined;
  paragraphSpacing?: number | undefined;
  lineHeight?: number | undefined;
  sectionSpacing?: number | undefined;
  headerSize?: number | undefined;
  subheaderSize?: number | undefined;
  useIconMode?: boolean | undefined;
  autoOnePage?: boolean | undefined;
  pageBreakLinesVisible?: boolean | undefined;
};

export interface ResumeTheme {
  id: string;
  name: string;
  color: string;
}

// 精选主题色（固定几个好看的预设，不做自由取色）
export const THEME_COLORS = [
  "#000000", // 经典黑（默认）
  "#4b5563", // 石墨灰
  "#1d4ed8", // 藏蓝
  "#2563eb", // 天蓝
  "#0d9488", // 青绿
  "#059669", // 翠绿
  "#e11d48", // 玫红
  "#ea580c", // 橙色
  "#7c3aed", // 紫色
];

export interface MenuSection {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
}

// 自定义板块内容：板块 id → 富文本 HTML
export interface ResumeData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  templateId: string | null | undefined; // 模板序号（"0"~"N-1"，读取用 getTemplateById 解析；旧数据可能为模板 id）
  basic: BasicInfo;
  education: Education[];
  experience: Experience[];
  internship: Experience[];
  projects: Project[];
  certificatesContent: string;
  customData: Record<string, string>;
  skillContent: string;
  selfEvaluationContent: string;
  activeSection: string;
  draggingProjectId: string | null;
  menuSections: MenuSection[];
  globalSettings: GlobalSettings;
}
