import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  isModelConfigured,
  type AIModelProfile,
  type AISettingsData,
} from "@/config/ai-models";

interface AIConfigState extends AISettingsData {
  saveModel: (profile: AIModelProfile) => void;
  deleteModel: (id: string) => void;
  assignModel: (id: string | null) => void;
  isConfigured: () => boolean;
}

// AI 配置持久化：Key 仅保存在本地浏览器 localStorage
export const useAIConfigStore = create<AIConfigState>()(
  persist<AIConfigState, [], [], AISettingsData>(
    (set, get) => ({
      models: [],
      textModelId: null,
      saveModel: (profile) =>
        set((state) => {
          const normalized = {
            ...profile,
            name: profile.name.trim(),
          };
          const exists = state.models.some((model) => model.id === profile.id);
          return {
            models: exists
              ? state.models.map((model) =>
                  model.id === profile.id ? normalized : model
                )
              : [...state.models, normalized],
          };
        }),
      deleteModel: (id) =>
        set((state) => ({
          models: state.models.filter((model) => model.id !== id),
          textModelId: state.textModelId === id ? null : state.textModelId,
        })),
      assignModel: (id) =>
        set((state) => {
          const profile = state.models.find((model) => model.id === id);
          if (id !== null && (!profile || !isModelConfigured(profile))) {
            return state;
          }
          return { textModelId: id };
        }),
      isConfigured: () => {
        const profile = get().models.find((m) => m.id === get().textModelId);
        return isModelConfigured(profile);
      },
    }),
    {
      name: "ai-config-storage",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ models, textModelId }) => ({ models, textModelId }),
    }
  )
);
