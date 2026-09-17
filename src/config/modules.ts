export interface ResumeModule {
  id: string;
  title: string;
  icon: string;
}

// icon 为 lucide-react 图标名（由模板渲染端按名渲染），不使用 emoji
// 默认板块及顺序（basic 固定排在最前，order=0，由 initialResumeData 维护）：
// 教育背景 → 专业技能 → 工作经历 → 实习经历 → 项目经历 → 荣誉证书 → 自我评价
export const STANDARD_MODULES: Record<string, ResumeModule> = {
  education: { id: "education", title: "教育背景", icon: "GraduationCap" },
  skills: { id: "skills", title: "专业技能", icon: "Zap" },
  experience: { id: "experience", title: "工作经历", icon: "Briefcase" },
  internship: { id: "internship", title: "实习经历", icon: "Laptop" },
  projects: { id: "projects", title: "项目经历", icon: "Rocket" },
  certificates: { id: "certificates", title: "荣誉证书", icon: "Award" },
  selfEvaluation: { id: "selfEvaluation", title: "自我评价", icon: "FileText" },
};
