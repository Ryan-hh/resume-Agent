import { AgentTool } from "@/lib/agent/agentLoop";
import { cloneResume, useResumeStore } from "@/store/useResumeStore";
import type { ResumeData } from "@/types/resume";

// 简历编辑工具集：Agent 通过这些白名单函数修改简历，操作直接落到 store
// （store 的 updateResume 自带历史记录，因此 Agent 的每次修改都能 Ctrl+Z 撤销）。

type SectionKey = "education" | "experience" | "internship" | "projects";

const SECTION_LABELS: Record<SectionKey, string> = {
  education: "教育背景",
  experience: "工作经历",
  internship: "实习经历",
  projects: "项目经历",
};

const TEXT_SECTION_FIELD: Record<string, keyof ResumeData> = {
  skills: "skillContent",
  selfEvaluation: "selfEvaluationContent",
  certificates: "certificatesContent",
};

const BASIC_FIELDS = [
  "name",
  "title",
  "email",
  "phone",
  "location",
  "birthDate",
] as const;

function pickId(): string {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createResumeAgentTools(resumeId: string): AgentTool[] {
  const getResume = () => useResumeStore.getState().resumes[resumeId];

  return [
    {
      name: "get_current_resume",
      description:
        "读取当前简历的完整 JSON（只读，不会改动任何内容）。每次开始修改前必须调用，先了解现状再操作。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在，请确认已打开一份简历";
        return JSON.stringify(resume, null, 2);
      },
    },

    {
      name: "update_basic",
      description:
        "更新基本信息字段。可用字段：name（姓名）、title（求职意向/头衔）、email（邮箱）、phone（电话）、location（城市）、birthDate（出生日期）。清除某字段时 value 传空字符串。",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: [...BASIC_FIELDS],
            description: "要修改的基本信息字段名",
          },
          value: { type: "string", description: "字段的新值" },
        },
        required: ["field", "value"],
        additionalProperties: false,
      },
      execute: async ({ field, value }) => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在";
        const key = String(field);
        if (!BASIC_FIELDS.includes(key as (typeof BASIC_FIELDS)[number])) {
          return `错误：基本信息不存在字段 ${key}，可用字段：${BASIC_FIELDS.join("、")}`;
        }
        useResumeStore.getState().updateResume(resumeId, {
          basic: { ...resume.basic, [key]: String(value ?? "") },
        });
        return `已更新 基本信息.${key} = "${String(value ?? "")}"`;
      },
    },

    {
      name: "upsert_section",
      description:
        "在经历类板块中新增或更新一个条目。section 取值：education（教育背景）、experience（工作经历）、internship（实习经历）、projects（项目经历）。" +
        "若存在相同标识的条目则覆盖更新：education 用 school+major 匹配，experience/internship 用 company+position 匹配，projects 用 name 匹配；否则新增。",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["education", "experience", "internship", "projects"] },
          item: {
            type: "object",
            description:
              "条目内容：education 为 { school, major, degree, startDate, endDate, description(在校经历，纯文本或简单 HTML 列表) }；" +
              "experience/internship 为 { company, position, startDate, endDate, isPresent, details(字符串数组) }；" +
              "projects 为 { name, role, startDate, endDate, description(字符串数组) }。",
          },
        },
        required: ["section", "item"],
        additionalProperties: false,
      },
      execute: async ({ section, item }) => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在";
        const key = String(section) as SectionKey;
        if (!SECTION_LABELS[key]) {
          return `错误：未知板块 ${section}，可用：${Object.keys(SECTION_LABELS).join("、")}`;
        }
        const list = resume[key] as unknown as Array<Record<string, unknown>>;
        const obj = (item ?? {}) as Record<string, unknown>;
        const matchKeys =
          key === "education" ? ["school", "major"] : key === "projects" ? ["name"] : ["company", "position"];
        const matchFn = (entry: Record<string, unknown>) =>
          matchKeys.every((k) => (entry[k] ?? "") === (obj[k] ?? ""));
        const index = list.findIndex(matchFn);
        const next = cloneResume(resume);
        const nextList = next[key] as unknown as Array<Record<string, unknown>>;
        if (index >= 0) {
          nextList[index] = { ...nextList[index], ...obj, id: nextList[index].id };
        } else {
          nextList.push({ ...obj, id: typeof obj.id === "string" ? obj.id : pickId() });
        }
        useResumeStore.getState().updateResume(resumeId, { [key]: nextList } as Partial<ResumeData>);
        return index >= 0
          ? `已更新${SECTION_LABELS[key]}条目（#${index + 1}，共 ${nextList.length} 条）`
          : `已新增${SECTION_LABELS[key]}条目（现共 ${nextList.length} 条）`;
      },
    },

    {
      name: "replace_field",
      description:
        "修改指定板块中某个条目的字段值。index 从 0 开始。details/description 传字符串数组整体替换；startDate/endDate 用 YYYY-MM 格式；isPresent 传布尔值表示是否至今。",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["education", "experience", "internship", "projects"] },
          index: { type: "integer", description: "条目索引，从 0 开始" },
          field: { type: "string", description: "条目内要修改的字段名" },
          value: {
            description: "新值（字符串 / 字符串数组 / 布尔值）",
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
              { type: "boolean" },
            ],
          },
        },
        required: ["section", "index", "field", "value"],
        additionalProperties: false,
      },
      execute: async ({ section, index, field, value }) => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在";
        const key = String(section) as SectionKey;
        if (!SECTION_LABELS[key]) return `错误：未知板块 ${section}`;
        const list = resume[key] as unknown as unknown as Array<Record<string, unknown>> | undefined;
        const i = Number(index);
        if (!list) return `错误：未知板块 ${section}`;
        if (!Number.isInteger(i) || i < 0 || i >= list.length) {
          return `错误：索引 ${index} 超出范围（该板块共 ${list.length} 条）`;
        }
        const next = cloneResume(resume);
        const nextList = next[key] as unknown as Array<Record<string, unknown>>;
        nextList[i] = { ...nextList[i], [String(field)]: value };
        useResumeStore.getState().updateResume(resumeId, { [key]: nextList } as Partial<ResumeData>);
        return `已更新${SECTION_LABELS[key]}条目 #${i + 1} 的字段 ${String(field)}`;
      },
    },

    {
      name: "remove_section_item",
      description:
        "删除指定板块中的某个条目。index 从 0 开始。删除后不可恢复，请确认索引准确。",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["education", "experience", "internship", "projects"] },
          index: { type: "integer", description: "条目索引，从 0 开始" },
        },
        required: ["section", "index"],
        additionalProperties: false,
      },
      execute: async ({ section, index }) => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在";
        const key = String(section) as SectionKey;
        const list = resume[key] as unknown as unknown as Array<Record<string, unknown>> | undefined;
        const i = Number(index);
        if (!SECTION_LABELS[key]) return `错误：未知板块 ${section}`;
        if (!list) return `错误：未知板块 ${section}`;
        if (!Number.isInteger(i) || i < 0 || i >= list.length) {
          return `错误：索引 ${index} 超出范围（该板块共 ${list.length} 条）`;
        }
        const next = cloneResume(resume);
        const nextList = next[key] as unknown as Array<Record<string, unknown>>;
        const removed = nextList.splice(i, 1)[0];
        useResumeStore.getState().updateResume(resumeId, { [key]: nextList } as Partial<ResumeData>);
        const label = removed?.company || removed?.school || removed?.name || "";
        return `已删除${SECTION_LABELS[key]}条目 ${label || `#${i + 1}`}（剩余 ${nextList.length} 条）`;
      },
    },

    {
      name: "update_text_content",
      description:
        "更新文本类板块内容：skills（专业技能，用换行分隔每条技能）、selfEvaluation（自我评价）、certificates（荣誉证书）。",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["skills", "selfEvaluation", "certificates"] },
          content: { type: "string", description: "新的文本内容" },
        },
        required: ["section", "content"],
        additionalProperties: false,
      },
      execute: async ({ section, content }) => {
        const resume = getResume();
        if (!resume) return "错误：简历不存在";
        const key = TEXT_SECTION_FIELD[String(section)];
        if (!key) return `错误：未知文本板块 ${section}`;
        useResumeStore.getState().updateResume(resumeId, {
          [key]: String(content ?? ""),
        } as Partial<ResumeData>);
        return `已更新${String(section)}内容（${String(content ?? "").length} 字）`;
      },
    },
  ];
}

export const AGENT_SYSTEM_PROMPT = `你是嵌入在简历编辑器中的 AI 助手，任务是根据用户要求修改当前简历。

工作方式（严格按顺序）：
1. 第一步必须调用 get_current_resume 读取当前简历的完整内容。
2. 根据用户要求逐项调用修改工具：update_basic（基本信息）、upsert_section（新增/更新经历条目）、replace_field（修改条目字段）、remove_section_item（删除条目）、update_text_content（技能/自我评价/荣誉证书）。
3. 全部修改完成后，用简短的中文总结你做了哪些改动；若信息不足，说明哪些内容建议用户补充，不要编造。

约束：
- 只修改用户明确要求、或能从用户文本中明确推断的内容；不要凭想象添加公司、学校、项目、时间等事实。
- 用户给的是一段简历素材文本时，将其拆解映射到对应板块；给的是一句话指令时，只执行该指令。
- 时间字段使用 YYYY-MM 格式；"至今"用 isPresent: true（或 endDate 为"至今"）。
- 修改要保守：不确定的字段保留原值，并在总结中说明。
- 所有回复使用中文。`;
