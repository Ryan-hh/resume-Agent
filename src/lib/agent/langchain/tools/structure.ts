import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { cloneResume } from "@/store/useResumeStore";
import { getResume, saveResume, pickId } from "./shared";
import { toRichHtml } from "../normalize";
import type { MenuSection } from "@/types/resume";

// 结构管理类工具：板块显隐、自定义板块增删（权限与 UI 一致）、板块排序

export function createStructureTools(resumeId: string) {
  return [
    tool(
      async ({ section }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const menu = resume.menuSections ?? [];
        const idx = menu.findIndex((s) => s.id === section);
        if (idx < 0) {
          return `错误：未找到板块 "${section}"。当前板块：${menu.map((s) => `${s.id}（${s.title}）`).join("、") || "（无）"}`;
        }
        const next = [...menu];
        next[idx] = { ...next[idx], enabled: !next[idx].enabled };
        if (!saveResume(resumeId, { menuSections: next })) {
          return "错误：简历不存在";
        }
        return `已${next[idx].enabled ? "显示" : "隐藏"}板块「${next[idx].title}」（${next[idx].id}）`;
      },
      {
        name: "toggle_section_visibility",
        description:
          "切换板块显示/隐藏（标准与自定义板块均可）。section 传板块 id（如 experience、projects、skills、custom-xxx）。隐藏不等于删除，可随时再显示。",
        schema: z.object({
          section: z.string().describe("板块 id（menuSections 中的 id）"),
        }),
      }
    ),

    tool(
      async ({ title, icon, content }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const name = String(title ?? "").trim();
        if (!name) return "错误：必须提供板块标题 title";
        const menu = resume.menuSections ?? [];
        if (menu.some((s) => s.title === name)) {
          return `错误：已存在同名板块「${name}」`;
        }
        const id = `custom-${Date.now().toString(36)}${pickId()}`;
        const maxOrder = menu.reduce((m, s) => Math.max(m, s.order ?? 0), -1);
        const nextMenu: MenuSection[] = [
          ...menu,
          { id, title: name, icon: icon ?? "FileText", enabled: true, order: maxOrder + 1 },
        ];
        const nextCustomData = { ...(resume.customData ?? {}) };
        if (typeof content === "string" && content.trim()) {
          nextCustomData[id] = toRichHtml(content);
        }
        if (!saveResume(resumeId, { menuSections: nextMenu, customData: nextCustomData })) {
          return "错误：简历不存在";
        }
        return `已创建自定义板块「${name}」（id: ${id}）${content ? "，并写入初始内容" : ""}`;
      },
      {
        name: "create_custom_section",
        description: "新建自定义板块（如「获奖经历」「专利」）。title 板块标题；icon 可选；content 可选初始内容。",
        schema: z.object({
          title: z.string().describe("板块标题，如「获奖经历」"),
          icon: z.string().optional().describe("板块图标（可选）"),
          content: z.string().optional().describe("初始内容（可选）"),
        }),
      }
    ),

    tool(
      async ({ section }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        if (!String(section).startsWith("custom-")) {
          return `错误：只有自定义板块（custom- 开头）可以删除；标准板块只能用 toggle_section_visibility 隐藏。「${section}」不是自定义板块`;
        }
        const menu = resume.menuSections ?? [];
        const target = menu.find((s) => s.id === section);
        if (!target) return `错误：未找到板块 "${section}"`;
        const nextMenu = menu.filter((s) => s.id !== section);
        const nextCustomData = { ...(resume.customData ?? {}) };
        delete nextCustomData[section];
        if (!saveResume(resumeId, { menuSections: nextMenu, customData: nextCustomData })) {
          return "错误：简历不存在";
        }
        return `已删除自定义板块「${target.title}」（${section}）及其内容`;
      },
      {
        name: "remove_custom_section",
        description:
          "删除自定义板块（id 以 custom- 开头）及其全部内容。标准板块（education、experience 等）不可删除，只能隐藏。删除不可恢复，请确认。",
        schema: z.object({
          section: z.string().describe("要删除的自定义板块 id，如 custom-xxx"),
        }),
      }
    ),

    tool(
      async ({ order }) => {
        const resume = getResume(resumeId);
        if (!resume) return "错误：简历不存在";
        const menu = resume.menuSections ?? [];
        const ids = menu.map((s) => s.id);
        const orderArr = Array.isArray(order) ? order.map(String) : [];
        if (orderArr.length !== ids.length || !ids.every((id) => orderArr.includes(id))) {
          return `错误：order 必须是全部板块 id 的重排。当前板块顺序：${ids.join(" → ")}`;
        }
        const nextMenu = orderArr
          .map((id, i) => {
            const s = menu.find((m) => m.id === id);
            return s ? { ...s, order: i } : null;
          })
          .filter((s): s is MenuSection => s !== null);
        if (!saveResume(resumeId, { menuSections: nextMenu })) {
          return "错误：简历不存在";
        }
        return `已调整板块顺序：${orderArr.join(" → ")}`;
      },
      {
        name: "reorder_sections",
        description: "调整板块展示顺序。order 传包含全部板块 id 的新顺序数组（只调换顺序）。",
        schema: z.object({
          order: z.array(z.string()).describe("板块 id 的新顺序"),
        }),
      }
    ),
  ];
}
