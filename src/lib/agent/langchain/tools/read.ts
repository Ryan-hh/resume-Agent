import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getResume, SECTION_LABELS } from "./shared";
import type { BasicInfo } from "@/types/resume";

// 读取类工具：按需读取，只拿当前任务需要的板块，避免整份简历进上下文

const SECTION_KEYS = [
  "basic",
  "education",
  "experience",
  "internship",
  "projects",
  "skills",
  "selfEvaluation",
  "certificates",
  "customData",
  "menuSections",
  "globalSettings",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

export function createReadTools(resumeId: string) {
  return [
    tool(
      async ({ section }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const key = section as SectionKey;
        let data: unknown;
        switch (key) {
          case "basic": {
            // 照片 base64 体积巨大且对模型无意义，省略
            const b: BasicInfo = { ...resume.basic };
            if (b.photo) b.photo = "[照片数据已省略]";
            data = b;
            break;
          }
          case "education":
          case "experience":
          case "internship":
          case "projects":
            data = resume[key];
            break;
          case "skills":
            data = resume.skillContent;
            break;
          case "selfEvaluation":
            data = resume.selfEvaluationContent;
            break;
          case "certificates":
            data = resume.certificatesContent;
            break;
          case "customData":
            data = resume.customData;
            break;
          case "menuSections":
            data = resume.menuSections;
            break;
          case "globalSettings":
            data = resume.globalSettings;
            break;
          default:
            return `错误：未知板块 ${section}。可用：${SECTION_KEYS.join("、")}`;
        }
        return JSON.stringify(data, null, 2);
      },
      {
        name: "get_section",
        description:
          "读取简历中指定板块的数据（只读）。section 取值：basic（基本信息，不含照片）、education（教育背景）、experience（工作经历）、internship（实习经历）、projects（项目经历）、skills（专业技能）、selfEvaluation（自我评价）、certificates（荣誉证书）、customData（自定义板块内容）、menuSections（板块结构与显隐）、globalSettings（样式设置）。修改哪个板块就读取哪个板块，不要一次读多个。",
        schema: z.object({
          section: z.enum(SECTION_KEYS).describe("要读取的板块名"),
        }),
      }
    ),

    tool(
      async () => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const lines: string[] = [];
        lines.push(`姓名：${resume.basic.name || "（未填）"}，求职意向：${resume.basic.title || "（未填）"}`);
        lines.push(`出生日期：${resume.basic.birthDate || "（未填）"}，性别：${resume.basic.gender || "（未填）"}`);
        lines.push(
          `联系方式：${[resume.basic.email, resume.basic.phone, resume.basic.location].filter(Boolean).join(" / ") || "（未填）"}`
        );
        for (const key of ["education", "experience", "internship", "projects"] as const) {
          const list = resume[key];
          const shown = list.filter((it) => it.visible !== false).length;
          lines.push(`${SECTION_LABELS[key]}：共 ${list.length} 条（展示 ${shown} 条）`);
        }
        lines.push(`技能：${resume.skillContent.split("\n").filter(Boolean).length} 条`);
        lines.push(`自定义板块：${Object.keys(resume.customData).length} 个`);
        lines.push(`头部对齐：${resume.basic.layout ?? "left"}，图标模式：${resume.globalSettings.useIconMode ? "开" : "关"}`);
        return lines.join("\n");
      },
      {
        name: "get_resume_summary",
        description: "读取简历轻量摘要（只读）：基本信息概览 + 各板块条目数 + 样式开关。了解整体结构时用它；需要板块细节再用 get_section。",
        schema: z.object({}),
      }
    ),
  ];
}
