import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getResume, saveResume, BASIC_FIELDS } from "./shared";
import { normalizeBool, normalizeDate, normalizeEnum, isValidImageDataUrl } from "../normalize";

const GENDER_VALUES = ["", "男", "女"] as const;

// 基本信息类工具：自由文本、出生年月（格式归一）、性别（胶囊枚举）、自定义字段、一寸照

export function createBasicTools(resumeId: string) {
  return [
    tool(
      async ({ field, value }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        if (!BASIC_FIELDS.includes(field)) {
          return `错误：基本信息不存在字段 ${field}，可用字段：${BASIC_FIELDS.join("、")}`;
        }
        const next = String(value ?? "");
        if (!saveResume(resumeId, { basic: { ...resume.basic, [field]: next } })) {
          return "错误：简历不存在";
        }
        return `已更新 基本信息.${field} = "${next}"`;
      },
      {
        name: "update_basic",
        description:
          "更新基本信息中的自由文本字段。可用字段：name（姓名）、title（求职意向/头衔）、email（邮箱）、phone（电话）、location（城市）、politicalStatus（政治面貌）、jobIntention（求职意向，与 title 不同时使用）。清除某字段时 value 传空字符串。",
        schema: z.object({
          field: z
            .enum(BASIC_FIELDS)
            .describe("要修改的基本信息字段名"),
          value: z.string().describe("字段的新值；清空该字段时传空字符串"),
        }),
      }
    ),

    tool(
      async ({ value, showAge }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const normalized = normalizeDate(value);
        if (!normalized) {
          return `错误：无法识别的出生日期 "${String(value)}"，请使用 YYYY-MM 格式（如 1998-05）重新调用`;
        }
        const age = normalizeBool(showAge);
        const patch: { birthDate: string; showAge?: boolean } = { birthDate: normalized };
        if (age !== null) patch.showAge = age;
        if (!saveResume(resumeId, { basic: { ...resume.basic, ...patch } })) {
          return "错误：简历不存在";
        }
        return `已更新出生日期为 ${normalized}${age === null ? "" : age ? "（展示年龄）" : "（不展示年龄）"}`;
      },
      {
        name: "update_birth_date",
        description:
          "更新出生日期。支持多种写法（如 1998年5月、1998-5、1998.05），会自动归一化为 YYYY-MM 格式；无法识别时返回错误。showAge 可选：true 表示在简历上展示年龄，false 表示不展示。",
        schema: z.object({
          value: z.string().describe("出生日期，如 1998年5月 或 1998-05"),
          showAge: z.boolean().optional().describe("是否展示年龄（可选）"),
        }),
      }
    ),

    tool(
      async ({ value }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const gender = normalizeEnum(value, GENDER_VALUES);
        if (gender === null) {
          return `错误：性别只能取 ${GENDER_VALUES.map((v) => `"${v || "不填"}"`).join(" / ")}，收到 "${String(value)}"`;
        }
        if (!saveResume(resumeId, { basic: { ...resume.basic, gender } })) {
          return "错误：简历不存在";
        }
        return `已更新性别${gender ? `为「${gender}」` : "（清空）"}`;
      },
      {
        name: "update_gender",
        description:
          "更新性别（胶囊单选，取值受限）。只能传：空字符串（不填）、男、女，其他值一律拒绝。",
        schema: z.object({
          value: z.enum(GENDER_VALUES).describe("性别：空字符串表示不填，男 或 女"),
        }),
      }
    ),

    tool(
      async ({ index, label, value, icon, visible, displayLabel }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        // 防御：历史数据可能把 customFields 存成对象，视为空数组
        const fields = Array.isArray(resume.basic.customFields) ? resume.basic.customFields : [];
        let target = -1;
        if (typeof index === "number" && Number.isInteger(index)) {
          if (index < 0 || index >= fields.length) {
            return `错误：自定义字段索引 ${index} 超出范围（共 ${fields.length} 个）`;
          }
          target = index;
        } else if (typeof label === "string" && label.trim()) {
          target = fields.findIndex((f) => f.label === label.trim());
          if (target < 0) {
            return `错误：未找到标签为 "${label.trim()}" 的自定义字段。当前字段：${fields.map((f) => f.label).join("、") || "（无）"}`;
          }
        } else {
          return "错误：必须提供 index（索引）或 label（现有标签）来定位要修改的自定义字段";
        }
        const next = [...fields];
        next[target] = {
          ...next[target],
          ...(typeof value === "string" ? { value } : {}),
          ...(typeof icon === "string" && icon ? { icon } : {}),
          ...(typeof visible === "boolean" ? { visible } : {}),
          ...(typeof displayLabel === "boolean" ? { displayLabel } : {}),
        };
        if (!saveResume(resumeId, { basic: { ...resume.basic, customFields: next } })) {
          return "错误：简历不存在";
        }
        return `已更新自定义字段「${next[target].label}」（值：${next[target].value}）`;
      },
      {
        name: "update_custom_field",
        description:
          "更新基本信息中的自定义字段（带图标的小字段，如个人网站、GitHub、语言等）。用 index（从 0 开始）或 label（现有标签）定位；至少提供 value / icon / visible / displayLabel 中一个修改项。icon 可选值：Globe、Github、MapPin、Phone、Mail、Heart、Languages、Link、Star、BookOpen。",
        schema: z.object({
          index: z.number().int().min(0).optional().describe("字段索引，从 0 开始；与 label 二选一"),
          label: z.string().optional().describe("现有字段的标签，如「GitHub」；与 index 二选一"),
          value: z.string().optional().describe("字段的新值，如 https://github.com/xxx"),
          icon: z.string().optional().describe("图标名（可选）"),
          visible: z.boolean().optional().describe("是否展示该字段（可选）"),
          displayLabel: z.boolean().optional().describe("是否展示标签文字（可选）"),
        }),
      }
    ),

    tool(
      async ({ photo }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        if (!isValidImageDataUrl(photo)) {
          return "错误：照片必须是 data:image/ 开头的图片数据（base64），且不超过 3MB。请重新提供图片数据";
        }
        if (!saveResume(resumeId, { basic: { ...resume.basic, photo } })) {
          return "错误：简历不存在";
        }
        return "已将照片设置为简历头像（照片会显示在简历头部）";
      },
      {
        name: "set_photo",
        description:
          "设置简历头像。photo 参数必须是完整的图片 data URL（data:image/... 的 base64 字符串），大小不超过 3MB。用于用户上传一寸照片替换头像的场景。",
        schema: z.object({
          photo: z.string().describe("图片 data URL，如 data:image/jpeg;base64,...."),
        }),
      }
    ),
  ];
}

// 供面板直接执行（上传照片 → 立即设头像，不经过模型决策）
export async function setPhotoDirect(resumeId: string, photoDataUrl: string): Promise<string> {
  if (!isValidImageDataUrl(photoDataUrl)) {
    return "错误：照片必须是 data:image/ 开头的图片数据（base64），且不超过 3MB";
  }
  const resume = getResume(resumeId);
  if (!resume) return "错误：简历不存在";
  saveResume(resumeId, { basic: { ...resume.basic, photo: photoDataUrl } });
  return "已将上传的照片设置为简历头像";
}
