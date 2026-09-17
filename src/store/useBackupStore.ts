import { create } from "zustand";
import {
  isFileSystemAccessSupported,
  isBackupConfigured,
  getBackupDirName,
  configureBackup,
  removeBackupConfig,
} from "@/utils/fileSystem";

interface BackupState {
  /** 当前浏览器是否支持文件夹访问（仅 Chromium 系） */
  supported: boolean;
  /** null = 检测中；true/false = 已/未开启备份 */
  isConfigured: boolean | null;
  /** 所选文件夹的名称（浏览器不提供完整路径，仅显示名称） */
  backupDir: string;
  refresh: () => Promise<void>;
  /** 弹出系统文件夹选择器并配置；canceled = 用户取消 */
  configure: () => Promise<{ status: "ok" | "canceled" | "error"; message?: string }>;
  remove: () => Promise<void>;
}

// 备份目录全局状态：侧边栏入口、启动横幅、设置页、编辑页头共用同一份状态
export const useBackupStore = create<BackupState>((set) => ({
  supported: isFileSystemAccessSupported(),
  isConfigured: null,
  backupDir: "",

  refresh: async () => {
    try {
      const configured = await isBackupConfigured();
      const dirName = configured ? await getBackupDirName() : "";
      set({
        supported: isFileSystemAccessSupported(),
        isConfigured: configured,
        backupDir: dirName ?? "",
      });
    } catch {
      // 浏览器不支持或读取失败：标记不可用
      set({ supported: false, isConfigured: null, backupDir: "" });
    }
  },

  configure: async () => {
    const result = await configureBackup();
    if (result.status === "canceled") {
      return { status: "canceled" };
    }
    if (result.status !== "ok") {
      return {
        status: "error",
        message: "message" in result ? result.message : "开启备份失败",
      };
    }
    set({ supported: true, isConfigured: true, backupDir: result.dirName });
    return { status: "ok" };
  },

  remove: async () => {
    try {
      await removeBackupConfig();
    } catch {
      // 本地状态清空即可
    }
    set({ isConfigured: false, backupDir: "" });
  },
}));
