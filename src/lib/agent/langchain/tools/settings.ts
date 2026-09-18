import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getResume, saveResume } from "./shared";
import { clampInt, normalizeBool, normalizeEnum } from "../normalize";
import { THEME_COLORS } from "@/types/resume";
import { FONT_OPTIONS } from "@/config/constants";

const LAYOUT_VALUES = ["left", "center", "right"] as const;
const RADIUS_VALUES = ["none", "medium", "full"] as const;
const FONT_VALUES = FONT_OPTIONS.map((f) => f.value) as [string, ...string[]];

// 布局与样式类工具：头部对齐、照片配置、全局设置（字号/间距/主题色/图标模式等）

export function createSettingsTools(resumeId: string) {
  return [
    tool(
      async ({ value }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const layout = normalizeEnum(value, LAYOUT_VALUES);
        if (layout === null) {
          return `错误：头部对齐只能取 ${LAYOUT_VALUES.join(" / ")}，收到 "${String(value)}"`;
        }
        if (!saveResume(resumeId, { basic: { ...resume.basic, layout } })) {
          return "错误：简历不存在";
        }
        const label = layout === "left" ? "靠左" : layout === "center" ? "居中" : "靠右";
        return `已将头部对齐方式改为：${label}`;
      },
      {
        name: "update_layout",
        description:
          "设置简历头部（姓名等个人信息）的对齐方式。取值：left（靠左）、center（居中）、right（靠右）。",
        schema: z.object({
          value: z.enum(LAYOUT_VALUES).describe("头部对齐方式：left / center / right"),
        }),
      }
    ),

    tool(
      async ({ visible, borderRadius }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const photoConfig = { ...(resume.basic.photoConfig ?? {}) };
        if (visible !== undefined) {
          const b = normalizeBool(visible);
          if (b === null) return "错误：visible 必须是布尔值";
          photoConfig.visible = b;
        }
        if (borderRadius !== undefined) {
          const r = normalizeEnum(borderRadius, RADIUS_VALUES);
          if (r === null) return `错误：圆角只能取 ${RADIUS_VALUES.join(" / ")}`;
          photoConfig.borderRadius = r;
        }
        if (!saveResume(resumeId, { basic: { ...resume.basic, photoConfig } })) {
          return "错误：简历不存在";
        }
        const label =
          photoConfig.borderRadius === "none" ? "直角" : photoConfig.borderRadius === "medium" ? "圆角" : "圆形";
        return `已更新照片配置：${photoConfig.visible === false ? "隐藏照片" : "显示照片"}，圆角=${label}`;
      },
      {
        name: "update_photo_config",
        description:
          "设置照片的展示配置。visible：是否显示照片；borderRadius：照片圆角，none（直角）/ medium（圆角）/ full（圆形）。",
        schema: z.object({
          visible: z.boolean().optional().describe("是否显示照片（可选）"),
          borderRadius: z.enum(RADIUS_VALUES).optional().describe("照片圆角（可选）"),
        }),
      }
    ),

    tool(
      async (patch) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const gs = { ...(resume.globalSettings ?? {}) };
        const errors: string[] = [];
        const out: Record<string, unknown> = { ...gs };

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
        if (!saveResume(resumeId, { globalSettings: out })) {
          return "错误：简历不存在";
        }
        const changed = Object.keys(patch).join("、");
        return `已更新全局样式设置（${changed}）`;
      },
      {
        name: "update_global_settings",
        description:
          "更新简历的全局样式设置（全部可选，只传需要修改的项）：" +
          "themeColor（主题色，必须来自预设色：#000000、#4b5563、#1d4ed8、#2563eb、#0d9488、#059669、#e11d48、#ea580c、#7c3aed）；" +
          "fontFamily（字体：黑体/微软雅黑/宋体/楷体/仿宋）；" +
          "baseFontSize（正文字号 10-24）、pagePadding（页边距 0-60）、paragraphSpacing（段落间距 0-40）、lineHeight（行高 1-3）、sectionSpacing（板块间距 0-60）、headerSize（标题字号 12-36）、subheaderSize（副标题字号 10-30）；" +
          "useIconMode（图标模式开/关）、autoOnePage（自动一页开/关）、pageBreakLinesVisible（分页线显示开/关）。",
        schema: z.object({
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
