import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import {
  BasicInfo,
  Education,
  Experience,
  GlobalSettings,
  Project,
  ResumeData,
  MenuSection,
} from "@/types/resume";
import { DEFAULT_TEMPLATES } from "@/config/templates";
import { initialResumeState } from "@/config/initialResumeData";
import { STANDARD_MODULES } from "@/config/modules";
import { generateUUID } from "@/lib/utils";
import { saveResumeJson, deleteResumeJson } from "@/utils/fileSystem";
import { useBackupStore } from "@/store/useBackupStore";

const HISTORY_LIMIT = 50;
const HISTORY_GROUP_WINDOW_MS = 1000;

interface UpdateResumeOptions {
  recordHistory?: boolean;
}

interface HistoryGroup {
  key: string;
  timestamp: number;
}

const lastHistoryGroups = new Map<string, HistoryGroup>();

export const cloneResume = (resume: ResumeData): ResumeData => {
  if (typeof structuredClone === "function") {
    return structuredClone(resume);
  }
  return JSON.parse(JSON.stringify(resume)) as ResumeData;
};

const getHistoryKey = (data: Partial<ResumeData>, options?: UpdateResumeOptions) => {
  if (options?.recordHistory === false) return null;
  const recordableKeys = Object.keys(data).filter(
    (key) => key !== "updatedAt" && key !== "activeSection" && key !== "draggingProjectId"
  );
  return recordableKeys.length > 0 ? recordableKeys.sort().join("|") : null;
};

const shouldPushHistoryEntry = (resumeId: string, historyKey: string) => {
  const now = Date.now();
  const lastGroup = lastHistoryGroups.get(resumeId);
  const shouldPush =
    !lastGroup || lastGroup.key !== historyKey || now - lastGroup.timestamp > HISTORY_GROUP_WINDOW_MS;
  if (shouldPush) {
    lastHistoryGroups.set(resumeId, { key: historyKey, timestamp: now });
  }
  return shouldPush;
};

const pushHistory = (
  history: Record<string, ResumeData[]>,
  resumeId: string,
  resume: ResumeData
) => ({
  ...history,
  [resumeId]: [...(history[resumeId] ?? []), cloneResume(resume)].slice(-HISTORY_LIMIT),
});

interface PendingSync {
  timer: ReturnType<typeof setTimeout>;
  prevResume?: ResumeData;
}

interface ResumeStore {
  resumes: Record<string, ResumeData>;
  activeResumeId: string | null;
  activeResume: ResumeData | null;
  history: Record<string, ResumeData[]>;
  future: Record<string, ResumeData[]>;
  firstRunCreated: boolean;

  createResume: (templateId?: string | null, isBlank?: boolean) => string;
  deleteResume: (resume: ResumeData) => void;
  duplicateResume: (resumeId: string) => string;
  updateResume: (resumeId: string, data: Partial<ResumeData>, options?: UpdateResumeOptions) => void;
  setActiveResume: (resumeId: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  updateResumeTitle: (title: string) => void;
  updateBasicInfo: (data: Partial<BasicInfo>) => void;
  updateEducation: (data: Education) => void;
  updateEducationBatch: (educations: Education[]) => void;
  deleteEducation: (id: string) => void;
  updateExperience: (data: Experience) => void;
  updateExperienceBatch: (experiences: Experience[]) => void;
  deleteExperience: (id: string) => void;
  updateInternship: (data: Experience) => void;
  updateInternshipBatch: (internships: Experience[]) => void;
  deleteInternship: (id: string) => void;
  updateProjects: (project: Project) => void;
  updateProjectsBatch: (projects: Project[]) => void;
  deleteProject: (id: string) => void;
  setDraggingProjectId: (id: string | null) => void;
  updateSkillContent: (skillContent: string) => void;
  updateSelfEvaluationContent: (content: string) => void;
  reorderSections: (newOrder: ResumeData["menuSections"]) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setActiveSection: (sectionId: string) => void;
  updateMenuSections: (sections: ResumeData["menuSections"]) => void;
  createCustomSection: (section: MenuSection) => void;
  updateCustomContent: (sectionId: string, content: string) => void;
  removeCustomData: (sectionId: string) => void;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  setThemeColor: (color: string) => void;
  setTemplate: (templateId: string) => void;
  addResume: (resume: ResumeData) => string;
  updateCertificatesContent: (content: string) => void;
  markFirstRunCreated: () => void;
}

type PersistedResumeStore = Pick<ResumeStore, "resumes" | "activeResumeId" | "firstRunCreated">;

const warnedPersistFailures = new Set<string>();

const warnPersistFailure = (name: string, error: unknown) => {
  if (warnedPersistFailures.has(name)) return;
  warnedPersistFailures.add(name);
  console.warn(`[resume-store] 持久化 "${name}" 失败，本次变更仅保留在内存中。`, error);
};

const createSafeLocalStorage = (): StateStorage => ({
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      warnPersistFailure(name, error);
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
});

const syncResumeToFile = async (resumeData: ResumeData, prevResume?: ResumeData) => {
  if (typeof window === "undefined") return;
  if (!useBackupStore.getState().isConfigured) return;
  await saveResumeJson(resumeData.title, resumeData, prevResume?.title);
};

const deleteResumeFile = async (resumeData: ResumeData) => {
  if (typeof window === "undefined") return;
  if (!useBackupStore.getState().isConfigured) return;
  await deleteResumeJson(resumeData.title);
};

const pendingSyncs = new Map<string, PendingSync>();
const clearPendingSync = (resumeId: string) => {
  const pendingSync = pendingSyncs.get(resumeId);
  if (!pendingSync) return;
  clearTimeout(pendingSync.timer);
  pendingSyncs.delete(resumeId);
};

const debouncedSyncToFile = (resumeData: ResumeData, prevResume?: ResumeData) => {
  const pendingSync = pendingSyncs.get(resumeData.id);
  if (pendingSync) clearTimeout(pendingSync.timer);
  const prevResumeForSync = pendingSync?.prevResume ?? prevResume;
  const timer = setTimeout(() => {
    syncResumeToFile(resumeData, prevResumeForSync);
    pendingSyncs.delete(resumeData.id);
  }, 1500);
  pendingSyncs.set(resumeData.id, { timer, prevResume: prevResumeForSync });
};

export const useResumeStore = create(
  persist<ResumeStore, [], [], PersistedResumeStore>(
    (set, get) => ({
      resumes: {},
      activeResumeId: null,
      activeResume: null,
      history: {},
      future: {},
      firstRunCreated: false,

      createResume: (templateId = null, isBlank = false) => {
        const id = generateUUID();
        const template = templateId
          ? DEFAULT_TEMPLATES.find((t) => t.id === templateId)
          : DEFAULT_TEMPLATES[0];

        const newResume: ResumeData = {
          ...cloneResume(initialResumeState as unknown as ResumeData),
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          templateId: template?.id,
          title: `新建简历 ${id.slice(0, 6)}`,
        };

        if (isBlank) {
          newResume.basic = {
            ...newResume.basic,
            name: "",
            title: "",
            email: "",
            phone: "",
            location: "",
            birthDate: "",
            photo: "",
            customFields: [],
          };
          newResume.education = [];
          newResume.experience = [];
          newResume.internship = [];
          newResume.projects = [];
          newResume.certificatesContent = "";
          newResume.skillContent = "";
          newResume.selfEvaluationContent = "";
          newResume.customData = {};
        } else if (template) {
          newResume.globalSettings = {
            ...newResume.globalSettings,
            themeColor: template.colorScheme.primary,
            sectionSpacing: template.spacing.sectionGap,
            paragraphSpacing: template.spacing.itemGap,
            pagePadding: template.spacing.contentPadding,
          };
          newResume.basic = {
            ...newResume.basic,
            layout: template.basic.layout,
          };
        }

        set((state) => ({
          resumes: { ...state.resumes, [id]: newResume },
          activeResumeId: id,
          activeResume: newResume,
          history: { ...state.history, [id]: [] },
          future: { ...state.future, [id]: [] },
        }));

        syncResumeToFile(newResume);
        return id;
      },

      updateResume: (resumeId, data, options) => {
        set((state) => {
          const resume = state.resumes[resumeId];
          if (!resume) return state;
          const historyKey = getHistoryKey(data, options);
          const shouldPushHistory = !!historyKey && shouldPushHistoryEntry(resumeId, historyKey);
          const shouldClearFuture = !!historyKey;
          const updatedResume = {
            ...resume,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          debouncedSyncToFile(updatedResume, resume);
          return {
            resumes: { ...state.resumes, [resumeId]: updatedResume },
            activeResume: state.activeResumeId === resumeId ? updatedResume : state.activeResume,
            history: shouldPushHistory ? pushHistory(state.history, resumeId, resume) : state.history,
            future: shouldClearFuture ? { ...state.future, [resumeId]: [] } : state.future,
          };
        });
      },

      deleteResume: (resume) => {
        set((state) => {
          const { [resume.id]: _removed, ...rest } = state.resumes;
          const history = { ...state.history };
          const future = { ...state.future };
          delete history[resume.id];
          delete future[resume.id];
          const keys = Object.keys(rest);
          const nextActiveId = state.activeResumeId === resume.id ? keys[0] ?? null : state.activeResumeId;
          return {
            resumes: rest,
            activeResumeId: nextActiveId,
            activeResume: nextActiveId ? rest[nextActiveId] : null,
            history,
            future,
          };
        });
        clearPendingSync(resume.id);
        deleteResumeFile(resume);
      },

      duplicateResume: (resumeId) => {
        const resume = get().resumes[resumeId];
        if (!resume) return resumeId;
        const newId = generateUUID();
        const now = new Date().toISOString();
        const newResume = {
          ...cloneResume(resume),
          id: newId,
          title: `${resume.title} - ${"副本"}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          resumes: { ...state.resumes, [newId]: newResume },
          history: { ...state.history, [newId]: [] },
          future: { ...state.future, [newId]: [] },
        }));
        syncResumeToFile(newResume);
        return newId;
      },

      setActiveResume: (resumeId) => {
        const resume = get().resumes[resumeId];
        if (!resume) return;
        set({ activeResumeId: resumeId, activeResume: resume });
      },

      undo: () => {
        const { activeResumeId, history, resumes } = get();
        if (!activeResumeId) return;
        const stack = history[activeResumeId] ?? [];
        if (stack.length === 0) return;
        const snapshot = stack[stack.length - 1];
        const updatedResume = { ...snapshot, updatedAt: new Date().toISOString() };
        set((state) => ({
          resumes: { ...state.resumes, [activeResumeId]: updatedResume },
          activeResume: updatedResume,
          history: { ...state.history, [activeResumeId]: stack.slice(0, -1) },
          future: {
            ...state.future,
            [activeResumeId]: [...(state.future[activeResumeId] ?? []), cloneResume(resumes[activeResumeId])].slice(-HISTORY_LIMIT),
          },
        }));
        debouncedSyncToFile(updatedResume);
      },

      redo: () => {
        const { activeResumeId, future, resumes } = get();
        if (!activeResumeId) return;
        const stack = future[activeResumeId] ?? [];
        if (stack.length === 0) return;
        const snapshot = stack[stack.length - 1];
        const updatedResume = { ...snapshot, updatedAt: new Date().toISOString() };
        set((state) => ({
          resumes: { ...state.resumes, [activeResumeId]: updatedResume },
          activeResume: updatedResume,
          future: { ...state.future, [activeResumeId]: stack.slice(0, -1) },
          history: {
            ...state.history,
            [activeResumeId]: [...(state.history[activeResumeId] ?? []), cloneResume(resumes[activeResumeId])].slice(-HISTORY_LIMIT),
          },
        }));
        debouncedSyncToFile(updatedResume);
      },

      canUndo: () => {
        const { activeResumeId, history } = get();
        return activeResumeId ? (history[activeResumeId]?.length ?? 0) > 0 : false;
      },

      canRedo: () => {
        const { activeResumeId, future } = get();
        return activeResumeId ? (future[activeResumeId]?.length ?? 0) > 0 : false;
      },

      updateResumeTitle: (title) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { title });
      },

      updateBasicInfo: (data) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, { basic: { ...activeResume.basic, ...data } });
      },

      updateEducation: (data) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const educations = activeResume.education.map((item) => (item.id === data.id ? data : item));
        get().updateResume(activeResumeId, { education: educations });
      },

      updateEducationBatch: (educations) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { education: educations });
      },

      deleteEducation: (id) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          education: activeResume.education.filter((item) => item.id !== id),
        });
      },

      updateExperience: (data) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const experiences = activeResume.experience.map((item) => (item.id === data.id ? data : item));
        get().updateResume(activeResumeId, { experience: experiences });
      },

      updateExperienceBatch: (experiences) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { experience: experiences });
      },

      deleteExperience: (id) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          experience: activeResume.experience.filter((item) => item.id !== id),
        });
      },

      updateProjects: (project) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const projects = activeResume.projects.map((item) => (item.id === project.id ? project : item));
        get().updateResume(activeResumeId, { projects });
      },

      updateProjectsBatch: (projects) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { projects });
      },

      deleteProject: (id) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          projects: activeResume.projects.filter((item) => item.id !== id),
        });
      },

      setDraggingProjectId: (id) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { draggingProjectId: id }, { recordHistory: false });
      },

      updateSkillContent: (skillContent) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { skillContent });
      },

      updateSelfEvaluationContent: (content) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { selfEvaluationContent: content });
      },

      updateCertificatesContent: (content) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { certificatesContent: content });
      },

      updateInternship: (data) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const internships = activeResume.internship.map((item) => (item.id === data.id ? data : item));
        get().updateResume(activeResumeId, { internship: internships });
      },

      updateInternshipBatch: (internships) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { internship: internships });
      },

      deleteInternship: (id) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          internship: activeResume.internship.filter((item) => item.id !== id),
        });
      },

      reorderSections: (newOrder) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { menuSections: newOrder });
      },

      toggleSectionVisibility: (sectionId) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const menuSections = activeResume.menuSections.map((s) =>
          s.id === sectionId ? { ...s, enabled: !s.enabled } : s
        );
        get().updateResume(activeResumeId, { menuSections });
      },

      setActiveSection: (sectionId) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        if (activeResume.activeSection === sectionId) return;
        get().updateResume(activeResumeId, { activeSection: sectionId }, { recordHistory: false });
      },

      updateMenuSections: (sections) => {
        const { activeResumeId } = get();
        if (!activeResumeId) return;
        get().updateResume(activeResumeId, { menuSections: sections });
      },

      createCustomSection: (section) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const nextId = (() => {
          let n = 1;
          const ids = new Set(activeResume.menuSections.map((s) => s.id));
          while (ids.has(`custom-${n}`)) n++;
          return `custom-${n}`;
        })();
        const newSection = {
          ...section,
          id: section.id === "custom" ? nextId : section.id,
          order: activeResume.menuSections.length,
        };
        get().updateResume(activeResumeId, {
          menuSections: [...activeResume.menuSections, newSection],
          customData: { ...activeResume.customData, [newSection.id]: "" },
        });
      },

      updateCustomContent: (sectionId, content) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          customData: { ...activeResume.customData, [sectionId]: content },
        });
      },

      removeCustomData: (sectionId) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const customData = { ...activeResume.customData };
        delete customData[sectionId];
        get().updateResume(activeResumeId, { customData });
      },

      updateGlobalSettings: (settings) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        get().updateResume(activeResumeId, {
          globalSettings: { ...activeResume.globalSettings, ...settings },
        });
      },

      setThemeColor: (color) => {
        get().updateGlobalSettings({ themeColor: color });
      },

      setTemplate: (templateId) => {
        const { activeResumeId, activeResume } = get();
        if (!activeResumeId || !activeResume) return;
        const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
        get().updateResume(activeResumeId, {
          templateId,
          globalSettings: {
            ...activeResume.globalSettings,
            themeColor: template?.colorScheme.primary ?? activeResume.globalSettings.themeColor,
            sectionSpacing: template?.spacing.sectionGap ?? activeResume.globalSettings.sectionSpacing,
            paragraphSpacing: template?.spacing.itemGap ?? activeResume.globalSettings.paragraphSpacing,
            pagePadding: template?.spacing.contentPadding ?? activeResume.globalSettings.pagePadding,
          },
          basic: {
            ...activeResume.basic,
            layout: template?.basic.layout ?? activeResume.basic.layout,
          },
        });
      },

      addResume: (resume) => {
        const id = resume.id || generateUUID();
        const now = new Date().toISOString();
        const newResume = { ...resume, id, updatedAt: now };
        set((state) => ({
          resumes: { ...state.resumes, [id]: newResume },
          history: { ...state.history, [id]: [] },
          future: { ...state.future, [id]: [] },
        }));
        syncResumeToFile(newResume);
        return id;
      },

      markFirstRunCreated: () => {
        set({ firstRunCreated: true });
      },
    }),
    {
      name: "resume-assistant-storage",
      storage: createJSONStorage(() => createSafeLocalStorage()),
      partialize: (state): PersistedResumeStore => ({
        resumes: state.resumes,
        activeResumeId: state.activeResumeId,
        firstRunCreated: state.firstRunCreated,
      }),
      version: 6,
      migrate: (persistedState, version) => {
        if (version >= 6) return persistedState as PersistedResumeStore;
        // persist 实际结构为 { state: { resumes, activeResumeId }, version }，兼容直接存 resumes 的形态
        const raw = persistedState as unknown as {
          state?: { resumes?: Record<string, ResumeData> };
          resumes?: Record<string, ResumeData>;
        };
        const resumes = raw.state?.resumes ?? raw.resumes ?? {};
        // 默认 8 大板块及顺序：基本信息(0) → 教育背景(1) → 专业技能(2) → 工作经历(3) → 实习经历(4) → 项目经历(5) → 荣誉证书(6) → 自我评价(7)
        const DEFAULT_SECTIONS = [
          { id: "basic", title: "基本信息", icon: "User" },
          { id: "education", title: "教育背景", icon: "GraduationCap" },
          { id: "skills", title: "专业技能", icon: "Zap" },
          { id: "experience", title: "工作经历", icon: "Briefcase" },
          { id: "internship", title: "实习经历", icon: "Laptop" },
          { id: "projects", title: "项目经历", icon: "Rocket" },
          { id: "certificates", title: "荣誉证书", icon: "Award" },
          { id: "selfEvaluation", title: "自我评价", icon: "FileText" },
        ];
        // 旧版单个日期字符串（如 "2021.07 - 2024.12" / "2021.06 - 至今"）拆分为起止字段
        const splitDateRange = (date?: string): { startDate: string; endDate: string; isPresent: boolean } => {
          if (!date) return { startDate: "", endDate: "", isPresent: false };
          const parts = date.split(/\s*-\s*/);
          const norm = (v: string) => v.replace(/^(\d{4})\.(\d{1,2})$/, "$1-$2");
          const rawStart = (parts[0] || "").trim();
          const rawEnd = (parts[1] || "").trim();
          if (!rawStart) return { startDate: "", endDate: norm(rawEnd), isPresent: false };
          if (!rawEnd || /至今|现在|present/i.test(rawEnd)) {
            return { startDate: norm(rawStart), endDate: "", isPresent: true };
          }
          return { startDate: norm(rawStart), endDate: norm(rawEnd), isPresent: false };
        };
        Object.keys(resumes).forEach((resumeId) => {
          const r = resumes[resumeId];
          if (!r) return;
          const byId = new Map((r.menuSections || []).map((s) => [s.id, s]));
          // 8 大板块：已有则沿用 enabled，标题/图标/顺序按新默认；缺失则补齐
          const next = DEFAULT_SECTIONS.map((d, i) => {
            const exist = byId.get(d.id);
            return exist
              ? { ...exist, title: d.title, icon: d.icon, order: i }
              : { ...d, enabled: true, order: i };
          });
          // 自定义板块保留，排在默认板块之后
          const customs = (r.menuSections || [])
            .filter((s) => s.id.startsWith("custom-"))
            .map((s, i) => ({ ...s, order: DEFAULT_SECTIONS.length + i }));
          r.menuSections = [...next, ...customs];
          // 新数据结构：实习经历、荣誉证书文本
          if (!Array.isArray(r.internship)) r.internship = [];
          if (typeof r.certificatesContent !== "string") r.certificatesContent = "";
          // 旧版证书为图片数组，迁移后不再使用
          delete (r as Partial<ResumeData> & { certificates?: unknown }).certificates;
          // v3 → v4：工作/实习/项目的时间字段拆分 + 移除项目链接
          (r.experience || []).forEach((e) => {
            const anyE = e as Experience & { date?: string };
            if (typeof anyE.date === "string" && anyE.date) {
              const s = splitDateRange(anyE.date);
              anyE.startDate = s.startDate;
              anyE.endDate = s.endDate;
              anyE.isPresent = s.isPresent;
              delete anyE.date;
            }
          });
          (r.internship || []).forEach((e) => {
            const anyE = e as Experience & { date?: string };
            if (typeof anyE.date === "string" && anyE.date) {
              const s = splitDateRange(anyE.date);
              anyE.startDate = s.startDate;
              anyE.endDate = s.endDate;
              anyE.isPresent = s.isPresent;
              delete anyE.date;
            }
          });
          (r.projects || []).forEach((p) => {
            const anyP = p as Project & { date?: string; link?: string; linkLabel?: string };
            if (typeof anyP.date === "string" && anyP.date) {
              const s = splitDateRange(anyP.date);
              anyP.startDate = s.startDate;
              anyP.endDate = s.endDate;
              anyP.isPresent = s.isPresent;
              delete anyP.date;
            }
            delete anyP.link;
            delete anyP.linkLabel;
          });
          // v4 → v5：自定义板块从条目数组迁移为单个富文本（拼接各条目的描述）
          if (r.customData && typeof r.customData === "object") {
            Object.keys(r.customData).forEach((key) => {
              const value = (r.customData as unknown as Record<string, unknown>)[key];
              if (Array.isArray(value)) {
                const merged = (value as Array<{ description?: string }>)
                  .map((it) => it.description || "")
                  .filter(Boolean)
                  .join("\n");
                (r.customData as unknown as Record<string, string>)[key] = merged;
              } else if (typeof value !== "string") {
                (r.customData as unknown as Record<string, string>)[key] = "";
              }
            });
          }
        });
        return persistedState as PersistedResumeStore;
      },
    }
  )
);

export const getStandardModuleDefaults = () => {
  const order: Record<string, number> = {};
  Object.keys(STANDARD_MODULES).forEach((id, index) => {
    order[id] = index + 1;
  });
  return order;
};
