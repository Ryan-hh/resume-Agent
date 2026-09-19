import { createReadTools } from "./read";
import { createBasicTools, setPhotoDirect } from "./basic";
import { createSectionTools } from "./sections";
import { createStructureTools } from "./structure";
import { createSettingsTools } from "./settings";
import { createAskUserTools } from "./ask";

// 工具分组：动态注入时按用户意图只注入相关组（read 组永远注入）
export type ToolGroup = "read" | "basic" | "sections" | "structure" | "settings" | "polish";

// 工具注册表：后续扩展（知识库检索、网页搜索等）在此追加即可
export function buildResumeTools(resumeId: string, groups?: ToolGroup[]) {
  const allowed = groups ? new Set(groups) : null;
  const include = (group: ToolGroup) => !allowed || allowed.has(group);
  // ask_user 硬约束：只在润色意图（显式命中 polish 组）时注入；
  // 未命中任何组（全量兜底）或其他意图均不注入——其他操作直接执行，不允许询问用户。
  // polish 意图同时需要读取工具（读板块内容后才能润色），这里一并带上。
  const polishEnabled = allowed ? allowed.has("polish") : false;
  return [
    ...(include("read") || polishEnabled ? createReadTools(resumeId) : []),
    ...(include("basic") ? createBasicTools(resumeId) : []),
    ...(include("sections") ? createSectionTools(resumeId) : []),
    ...(include("structure") ? createStructureTools(resumeId) : []),
    ...(include("settings") ? createSettingsTools(resumeId) : []),
    ...(polishEnabled ? createAskUserTools() : []),
  ];
}

// 面板直接执行入口：上传照片 → 立即设置头像（不经过模型决策）
export { setPhotoDirect };
