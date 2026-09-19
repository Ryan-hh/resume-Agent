import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getResume, saveResume } from "./shared";
import { clampInt, normalizeBool, normalizeEnum } from "../normalize";
import { THEME_COLORS } from "@/types/resume";
import { FONT_OPTIONS } from "@/config/constants";

const LAYOUT_VALUES = ["left", "center", "right"] as const;
const RADIUS_VALUES = ["none", "medium", "full"] as const;
const FONT_VALUES = FONT_OPTIONS.map((f) => f.value) as [string, ...string[]];

// 样式统一入口：头部对齐 / 照片配置 / 全局样式（字号、间距、主题色、图标模式等）
// 全部参数可选，一次调用可同时改多个

export function createSettingsTools(resumeId: string) {
  return [
    tool(
      async (patch) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const errors: string[] = [];
        const basicPatch: { layout?: string; photoConfig?: Record<string, unknown> } = {};
        const gs = { ...(resume.globalSettings ?? {}) };
        const out: Record<string, unknown> = { ...gs };

        // 头部对齐（basic.layout）
        if (patch.layout !== undefined) {
          const v = normalizeEnum(patch.layout, LAYOUT_VALUES);
          if (v === null) errors.push(`头部对齐只能取 ${LAYOUT_VALUES.join(" / ")}`);
          else basicPatch.layout = v;
        }
        // 照片配置（basic.photoConfig）
        if (patch.photoVisible !== undefined || patch.photoBorderRadius !== undefined) {
          const pc = { ...(resume.basic.photoConfig ?? {}) };
          if (patch.photoVisible !== undefined) {
            const b = normalizeBool(patch.photoVisible);
            if (b === null) errors.push("photoVisible 必须是布尔值");
            else pc.visible = b;
          }
          if (patch.photoBorderRadius !== undefined) {
            const r = normalizeEnum(patch.photoBorderRadius, RADIUS_VALUES);
            if (r === null) errors.push(`照片圆角只能取 ${RADIUS_VALUES.join(" / ")}`);
            else pc.borderRadius = r;
          }
          basicPatch.photoConfig = pc;
        }

        const setInt = (key: keyof typeof patch, min: number, max: number, label: string) => {
          if (patch[key] === undefined) return;
          const v = clampInt(patch[key], min, max);
          if (v === null) errors.push(`${label}需为 ${min}-${max} 的整数`);
          else out[key] = v;
        };
        // 行高是倍数，允许一位小数
        if (patch.lineHeight !== undefined) {
          const n = Number(patch.lineHeight);
          if (!Number.isFinite(n) || n < 1 || n > 3) errors.push("行高需为 1-3 的数");
          else out.lineHeight = Math.round(n * 10) / 10;
        }
        const setBool = (key: keyof typeof patch, label: string) => {
          if (patch[key] === undefined) return;
          const v = normalizeBool(patch[key]);
          if (v === null) errors.push(`${label}必须是布尔值`);
          else out[key] = v;
        };

        if (patch.themeColor !== undefined) {
          const c = normalizeEnum(patch.themeColor, THEME_COLORS);
          if (c === null) errors.push(`主题色必须是预设色：${THEME_COLORS.join("、")}`);
          else out.themeColor = c;
        }
        if (patch.fontFamily !== undefined) {
          const f = normalizeEnum(patch.fontFamily, FONT_VALUES);
          if (f === null) errors.push("字体必须是预设字体（黑体/微软雅黑/宋体/楷体/仿宋）");
          else out.fontFamily = f;
        }
        setInt("baseFontSize", 10, 24, "正文字号");
        setInt("pagePadding", 0, 60, "页边距");
        setInt("paragraphSpacing", 0, 40, "段落间距");
        setInt("sectionSpacing", 0, 60, "板块间距");
        setInt("headerSize", 12, 36, "标题字号");
        setInt("subheaderSize", 10, 30, "副标题字号");
        setBool("useIconMode", "图标模式");
        setBool("autoOnePage", "自动一页");
        setBool("pageBreakLinesVisible", "分页线显示");

        if (errors.length) return `错误：${errors.join("；")}`;

        const patchObj: Record<string, unknown> = {};
        if (Object.keys(basicPatch).length) patchObj.basic = { ...resume.basic, ...basicPatch };
        if (JSON.stringify(out) !== JSON.stringify(gs)) patchObj.globalSettings = out;
        if (!Object.keys(patchObj).length) return "未提供任何需要修改的样式项";
        if (!saveResume(resumeId, patchObj as never)) {
          return "错误：简历不存在";
        }
        return `已更新样式设置（${Object.keys(patch).join("、")}）`;
      },
      {
        name: "update_global_settings",
        description:
          "更新简历样式（全部可选，只传需要修改的项）。layout：头部对齐 left/center/right；photoVisible：显示照片；photoBorderRadius：照片圆角 none（直角）/medium（圆角）/full（圆形）；themeColor：主题色（预设：#000000、#4b5563、#1d4ed8、#2563eb、#0d9488、#059669、#e11d48、#ea580c、#7c3aed）；fontFamily：字体（黑体/微软雅黑/宋体/楷体/仿宋）；baseFontSize：正文字号 10-24；pagePadding：页边距 0-60；paragraphSpacing：段落间距 0-40；lineHeight：行高 1-3；sectionSpacing：板块间距 0-60；headerSize：标题字号 12-36；subheaderSize：副标题字号 10-30；useIconMode：图标模式；autoOnePage：自动一页；pageBreakLinesVisible：分页线显示。",
        schema: z.object({
          layout: z.enum(LAYOUT_VALUES).optional().describe("头部对齐：left / center / right"),
          photoVisible: z.boolean().optional().describe("是否显示照片"),
          photoBorderRadius: z.enum(RADIUS_VALUES).optional().describe("照片圆角：none / medium / full"),
          themeColor: z.string().optional(),
          fontFamily: z.string().optional(),
          baseFontSize: z.number().optional(),
          pagePadding: z.number().optional(),
          paragraphSpacing: z.number().optional(),
          lineHeight: z.number().optional(),
          sectionSpacing: z.number().optional(),
          headerSize: z.number().optional(),
          subheaderSize: z.number().optional(),
          useIconMode: z.boolean().optional(),
          autoOnePage: z.boolean().optional(),
          pageBreakLinesVisible: z.boolean().optional(),
        }),
      }
    ),
  ];
}
