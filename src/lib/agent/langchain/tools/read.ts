import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getResume, SECTION_LABELS } from "./shared";

// 读取类工具：了解现状再动手

export function createReadTools(resumeId: string) {
  return [
    tool(
      async () => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在，请确认已打开一份简历";
        return JSON.stringify(resume, null, 2);
      },
      {
        name: "get_current_resume",
        description:
          "读取当前简历的完整 JSON（只读，不会改动任何内容）。首次开始修改前必须调用，先了解现状再操作。",
        schema: z.object({}),
      }
    ),

    tool(
      async () => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const lines: string[] = [];
        lines.push(`姓名：${resume.basic.name || "（未填）"}`);
        lines.push(`求职意向：${resume.basic.title || "（未填）"}`);
        lines.push(`出生日期：${resume.basic.birthDate || "（未填）"}，性别：${resume.basic.gender || "（未填）"}`);
        lines.push(`联系方式：${[resume.basic.email, resume.basic.phone, resume.basic.location].filter(Boolean).join(" / ") || "（未填）"}`);
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
        description:
          "读取当前简历的轻量摘要（只读）。上下文较长时优先用它了解结构，需要细节再调用 get_current_resume 获取完整内容。",
        schema: z.object({}),
      }
    ),
  ];
}
