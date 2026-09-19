import { create } from "zustand";

/**
 * 全局 AI 助手协调 store：让编辑器任意位置（如「AI 润色」按钮）可以
 * 1) 请求打开 AI 助手面板；2) 向面板注入一条待自动发送的消息。
 * AIEditorPanel 挂载后消费 pendingPrompt，WorkbenchPage 消费 aiPanelRequested。
 */
interface PendingPrompt {
  id: string;
  text: string;
}

interface AIAgentState {
  /** 待自动发送的消息（消费后置空） */
  pendingPrompt: PendingPrompt | null;
  /** 是否请求打开 AI 面板（消费后置 false） */
  aiPanelRequested: boolean;
  /** 发起「AI 润色」：把内容交给 AI 助手润色，完成后由 ask_user 询问是否应用 */
  requestPolish: (sectionLabel: string | undefined, text: string) => void;
  /** AIEditorPanel 消费掉待发送消息 */
  consumePrompt: () => void;
}

export const useAIAgentStore = create<AIAgentState>((set) => ({
  pendingPrompt: null,
  aiPanelRequested: false,
  requestPolish: (sectionLabel, text) => {
    const label = sectionLabel ? `（板块：${sectionLabel}）` : "";
    const prompt =
      `请润色下面这段简历内容${label}。要求：在不改变事实与结构的前提下，让表达更精炼、专业、有力；保留原有分段、列表与要点。` +
      `润色完成后，必须调用 ask_user 工具询问我是否将结果应用到简历，不要直接修改。` +
      `\n\n【待润色内容】\n${text}`;
    set({ pendingPrompt: { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text: prompt }, aiPanelRequested: true });
  },
  consumePrompt: () => set({ pendingPrompt: null, aiPanelRequested: false }),
}));
