import { cloneResume, useResumeStore } from "@/store/useResumeStore";
import type { ResumeData } from "@/types/resume";

// 工具执行体共用的 store 读写封装：所有修改走 updateResume（自带历史，可 Ctrl+Z 撤销）

export type SectionKey = "education" | "experience" | "internship" | "projects";

export const SECTION_LABELS: Record<SectionKey, string> = {
  education: "教育背景",
  experience: "工作经历",
  internship: "实习经历",
  projects: "项目经历",
};

export const TEXT_SECTION_FIELD: Record<string, keyof ResumeData> = {
  skills: "skillContent",
  selfEvaluation: "selfEvaluationContent",
  certificates: "certificatesContent",
};

export const BASIC_FIELDS = [
  "name",
  "title",
  "email",
  "phone",
  "location",
  "politicalStatus",
  "jobIntention",
] as const;

export function pickId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getResume(resumeId: string): ResumeData | null {
  return useResumeStore.getState().resumes[resumeId] ?? null;
}

export function saveResume(resumeId: string, patch: Partial<ResumeData>): boolean {
  if (!getResume(resumeId)) return false;
  useResumeStore.getState().updateResume(resumeId, patch);
  return true;
}

/** 兼容旧数据的自由文本 → 新结构；details/description 存字符串（渲染端按换行分段） */
export function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v ?? "").trim())
      .filter((v) => v !== "")
      .join("\n");
  }
  return "";
}
