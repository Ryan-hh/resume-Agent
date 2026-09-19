import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { cloneResume } from "@/store/useResumeStore";
import {
  getResume,
  saveResume,
  pickId,
  SECTION_LABELS,
  TEXT_SECTION_FIELD,
  toText,
  type SectionKey,
} from "./shared";
import { normalizeBool, normalizeDate, normalizeEndDate, toRichHtml } from "../normalize";

const SECTION_KEYS = ["education", "experience", "internship", "projects"] as const;
const TEXT_KEYS = ["skills", "selfEvaluation", "certificates"] as const;

// 经历四板块 + 三个文本板块的增删改
export function createSectionTools(resumeId: string) {
  return [
    tool(
      async ({ section, item }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const key = section as SectionKey;
        if (!SECTION_LABELS[key]) {
          return `错误：未知板块 ${section}，可用：${Object.keys(SECTION_LABELS).join("、")}`;
        }
        const list = resume[key] as unknown as Array<Record<string, unknown>>;
        const obj: Record<string, unknown> = { ...(item as Record<string, unknown>) };

        // 日期归一化（education 无 isPresent）
        if (key !== "education") {
          const isPresent = normalizeBool(obj.isPresent);
          if (isPresent === true) {
            obj.isPresent = true;
            delete obj.endDate;
          } else {
            obj.isPresent = isPresent ?? false;
            if (obj.endDate !== undefined && obj.endDate !== null) {
              const end = normalizeEndDate(obj.endDate);
              if (obj.endDate !== "" && end === null) {
                return `错误：结束日期 "${String(obj.endDate)}" 无法识别，请用 YYYY-MM 或「至今」`;
              }
              if (end === "至今") {
                obj.isPresent = true;
                delete obj.endDate;
              } else {
                obj.endDate = end;
              }
            }
          }
        }
        for (const dateField of ["startDate", "endDate"]) {
          if (obj[dateField] === undefined || obj[dateField] === null) continue;
          const raw = String(obj[dateField]);
          if (raw === "" || raw === "至今") continue;
          const d = normalizeDate(raw);
          if (!d) return `错误：${dateField} "${raw}" 无法识别，请用 YYYY-MM 格式`;
          obj[dateField] = d;
        }
        // details/description 归一为字符串（渲染端按换行分段）
        for (const textField of ["details", "description"]) {
          if (obj[textField] !== undefined && obj[textField] !== null) {
            obj[textField] = toText(obj[textField]);
          }
        }
        // id：由本工具生成，不接受模型指定（避免覆盖他人条目）
        delete obj.id;

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
          nextList.push({ ...obj, id: pickId() });
        }
        if (!saveResume(resumeId, { [key]: nextList } as never)) {
          return "错误：简历不存在";
        }
        return index >= 0
          ? `已更新${SECTION_LABELS[key]}条目（#${index + 1}，共 ${nextList.length} 条）`
          : `已新增${SECTION_LABELS[key]}条目（现共 ${nextList.length} 条）`;
      },
      {
        name: "upsert_section",
        description:
          "新增或更新经历类板块条目。section：education（教育背景）、experience（工作经历）、internship（实习经历）、projects（项目经历）。" +
          "存在相同标识则覆盖更新：education 按 school+major 匹配，experience/internship 按 company+position 匹配，projects 按 name 匹配；否则新增。" +
          "时间用 YYYY-MM；「至今」用 isPresent: true。details/description 可传字符串数组或换行文本。" +
          "education 字段：school、major、degree、startDate、endDate、description；" +
          "experience/internship 字段：company、position、startDate、endDate、isPresent、details；" +
          "projects 字段：name、role、startDate、endDate、isPresent、description。",
        schema: z.object({
          section: z.enum(SECTION_KEYS),
          item: z.record(z.string(), z.unknown()).describe("条目内容，字段见描述"),
        }),
      }
    ),

    tool(
      async ({ section, index, field, value }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const key = section as SectionKey;
        if (!SECTION_LABELS[key]) return `错误：未知板块 ${section}`;
        const list = resume[key] as unknown as Array<Record<string, unknown>> | undefined;
        if (!list) return `错误：未知板块 ${section}`;
        const i = Number(index);
        if (!Number.isInteger(i) || i < 0 || i >= list.length) {
          return `错误：索引 ${index} 超出范围（该板块共 ${list.length} 条）`;
        }

        let normalized: unknown = value;
        const fieldName = String(field);
        // 值类型归一化：日期 / 布尔 / 文本列表 / 文本
        if (fieldName === "startDate" || fieldName === "endDate") {
          if (fieldName === "endDate" && normalizeBool(value) === true) {
            normalized = "";
          } else {
            const d = normalizeDate(value);
            if (!d) return `错误：${fieldName} "${String(value)}" 无法识别，请用 YYYY-MM 格式`;
            normalized = d;
          }
        } else if (fieldName === "isPresent") {
          const b = normalizeBool(value);
          if (b === null) return `错误：isPresent 必须是布尔值`;
          normalized = b;
        } else if (fieldName === "details" || fieldName === "description") {
          normalized = toText(value);
        } else if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
          normalized = value;
        } else {
          normalized = String(value ?? "");
        }

        const next = cloneResume(resume);
        const nextList = next[key] as unknown as Array<Record<string, unknown>>;
        nextList[i] = { ...nextList[i], [fieldName]: normalized };
        if (!saveResume(resumeId, { [key]: nextList } as never)) {
          return "错误：简历不存在";
        }
        return `已更新${SECTION_LABELS[key]}条目 #${i + 1} 的字段 ${fieldName}`;
      },
      {
        name: "replace_field",
        description:
          "修改板块中某条目的字段值。index 从 0 开始。startDate/endDate 自动归一化为 YYYY-MM；isPresent 传布尔（是否至今）；details/description 传字符串数组或换行文本整体替换。",
        schema: z.object({
          section: z.enum(SECTION_KEYS),
          index: z.number().int().min(0).describe("条目索引，从 0 开始"),
          field: z.string().describe("条目内要修改的字段名"),
          value: z.union([z.string(), z.array(z.string()), z.boolean()]).describe("新值"),
        }),
      }
    ),

    tool(
      async ({ section, index }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const key = section as SectionKey;
        if (!SECTION_LABELS[key]) return `错误：未知板块 ${section}`;
        const list = resume[key] as unknown as Array<Record<string, unknown>> | undefined;
        if (!list) return `错误：未知板块 ${section}`;
        const i = Number(index);
        if (!Number.isInteger(i) || i < 0 || i >= list.length) {
          return `错误：索引 ${index} 超出范围（该板块共 ${list.length} 条）`;
        }
        const next = cloneResume(resume);
        const nextList = next[key] as unknown as Array<Record<string, unknown>>;
        const removed = nextList.splice(i, 1)[0];
        if (!saveResume(resumeId, { [key]: nextList } as never)) {
          return "错误：简历不存在";
        }
        const label = removed?.company || removed?.school || removed?.name || "";
        return `已删除${SECTION_LABELS[key]}条目 ${label || `#${i + 1}`}（剩余 ${nextList.length} 条）`;
      },
      {
        name: "remove_section_item",
        description: "删除板块中的条目。index 从 0 开始。删除立即生效、用户可撤销，请先确认索引准确。",
        schema: z.object({
          section: z.enum(SECTION_KEYS),
          index: z.number().int().min(0).describe("条目索引，从 0 开始"),
        }),
      }
    ),

    tool(
      async ({ section, content }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const key = TEXT_SECTION_FIELD[section];
        if (!key) return `错误：未知文本板块 ${section}`;
        // skills 存换行分隔文本；自我评价/荣誉证书存富文本（自动净化 HTML）
        const nextContent = section === "skills" ? toText(content) : toRichHtml(content);
        if (!saveResume(resumeId, { [key]: nextContent } as never)) {
          return "错误：简历不存在";
        }
        return `已更新${section === "skills" ? "专业技能" : section === "selfEvaluation" ? "自我评价" : "荣誉证书"}内容（${nextContent.length} 字符）`;
      },
      {
        name: "update_text_content",
        description:
          "更新文本板块内容：skills（专业技能，技能用换行或顿号分隔）、selfEvaluation（自我评价，可带简单 HTML）、certificates（荣誉证书，可带简单 HTML）。",
        schema: z.object({
          section: z.enum(TEXT_KEYS),
          content: z.string().describe("新的文本内容"),
        }),
      }
    ),
  ];
}
