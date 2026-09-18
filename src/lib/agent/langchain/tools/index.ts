import { createReadTools } from "./read";
import { createBasicTools, setPhotoDirect } from "./basic";
import { createSectionTools } from "./sections";
import { createStructureTools } from "./structure";
import { createSettingsTools } from "./settings";

// 工具注册表：后续扩展（知识库检索、网页搜索等）在此追加即可
export function buildResumeTools(resumeId: string) {
  return [
    ...createReadTools(resumeId),
    ...createBasicTools(resumeId),
    ...createSectionTools(resumeId),
    ...createStructureTools(resumeId),
    ...createSettingsTools(resumeId),
  ];
}

// 面板直接执行入口：上传照片 → 立即设置头像（不经过模型决策）
export { setPhotoDirect };
