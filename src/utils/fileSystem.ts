// File System Access API 封装（自动备份用，仅 Chromium 系浏览器支持）
// 浏览器只向网页授权「目录句柄」，不暴露完整磁盘路径（安全设计）。
// 本功能因此只显示所选文件夹的名称；选中的文件夹即备份根目录，
// 简历 JSON 与 AI 配置 JSON 直接保存在其中。

const HANDLE_KEY = "resume-sync-directory-handle";
const AI_CONFIG_FILE = "ai-config.json";

// TS DOM 类型库未包含 showDirectoryPicker，这里补充声明
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const sanitizeFileName = (name: string): string => {
  const cleaned = (name || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .trim();
  return cleaned || "未命名简历";
};

export const isFileSystemAccessSupported = (): boolean =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB 不可用"));
      return;
    }
    const request = indexedDB.open("resume-file-handles", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const idb = await openDatabase();
    return await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      const tx = idb.transaction("handles", "readonly");
      const store = tx.objectStore("handles");
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () =>
        resolve((request.result as FileSystemDirectoryHandle) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const setDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  try {
    const idb = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      store.put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

const removeDirectoryHandle = async (): Promise<void> => {
  try {
    const idb = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      store.delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

const queryPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  try {
    const anyHandle = handle as unknown as {
      queryPermission?: (o: { mode: string }) => Promise<string>;
    };
    if (!anyHandle.queryPermission) return true;
    return (await anyHandle.queryPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
};

const requestPermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  try {
    const anyHandle = handle as unknown as {
      queryPermission?: (o: { mode: string }) => Promise<string>;
      requestPermission?: (o: { mode: string }) => Promise<string>;
    };
    if (!anyHandle.queryPermission || !anyHandle.requestPermission) return true;
    if ((await anyHandle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    if ((await anyHandle.requestPermission({ mode: "readwrite" })) === "granted") return true;
    return false;
  } catch {
    return false;
  }
};

/** 是否已开启自动备份（句柄是否已授权并保存） */
export const isBackupConfigured = async (): Promise<boolean> => {
  return (await getDirectoryHandle()) !== null;
};

/** 所选文件夹的名称（浏览器不提供完整路径） */
export const getBackupDirName = async (): Promise<string | null> => {
  const handle = await getDirectoryHandle();
  return handle ? handle.name : null;
};

export type ConfigureBackupResult =
  | { status: "ok"; dirName: string }
  | { status: "canceled" }
  | { status: "unsupported" }
  | { status: "error"; message: string };

/**
 * 弹出系统文件夹选择器：选中的文件夹即备份根目录，
 * 简历 JSON 与 AI 配置将直接保存在其中。
 */
export const configureBackup = async (): Promise<ConfigureBackupResult> => {
  if (!isFileSystemAccessSupported()) return { status: "unsupported" };
  const picker = window.showDirectoryPicker;
  if (!picker) return { status: "unsupported" };
  try {
    const dirHandle = await picker({
      id: "resume-backup-root",
      mode: "readwrite",
    });
    if (!(await requestPermission(dirHandle))) {
      return { status: "error", message: "未获得该文件夹的读写权限" };
    }
    await setDirectoryHandle(dirHandle);
    return { status: "ok", dirName: dirHandle.name };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "canceled" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "选择文件夹失败",
    };
  }
};

/** 停止备份：清除已保存的授权句柄（不删除已写入的 JSON 文件） */
export const removeBackupConfig = async (): Promise<void> => {
  await removeDirectoryHandle();
};

/** 写入/更新一份简历 JSON；改名时自动清理旧文件。返回是否写入成功。 */
export const saveResumeJson = async (
  title: string,
  data: unknown,
  prevTitle?: string
): Promise<boolean> => {
  try {
    const dirHandle = await getDirectoryHandle();
    if (!dirHandle) return false;
    if (!(await queryPermission(dirHandle))) return false;
    const fileName = `${sanitizeFileName(title)}.json`;
    if (prevTitle && prevTitle !== title) {
      try {
        await dirHandle.removeEntry(`${sanitizeFileName(prevTitle)}.json`);
      } catch {
        // ignore：旧文件不存在也正常
      }
    }
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (error) {
    console.error("自动备份写入失败:", error);
    return false;
  }
};

/** 删除一份简历 JSON。返回是否删除成功。 */
export const deleteResumeJson = async (title: string): Promise<boolean> => {
  try {
    const dirHandle = await getDirectoryHandle();
    if (!dirHandle) return false;
    if (!(await queryPermission(dirHandle))) return false;
    await dirHandle.removeEntry(`${sanitizeFileName(title)}.json`);
    return true;
  } catch {
    return false;
  }
};

/** 写入 AI 配置（models + textModelId）到 ai-config.json。返回是否成功。 */
export const saveAiConfigFile = async (data: unknown): Promise<boolean> => {
  try {
    const dirHandle = await getDirectoryHandle();
    if (!dirHandle) return false;
    if (!(await queryPermission(dirHandle))) return false;
    const fileHandle = await dirHandle.getFileHandle(AI_CONFIG_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (error) {
    console.error("AI 配置备份写入失败:", error);
    return false;
  }
};

/** 读取已备份的 AI 配置；无备份或读取失败时返回 null */
export const loadAiConfigFile = async (): Promise<unknown | null> => {
  try {
    const dirHandle = await getDirectoryHandle();
    if (!dirHandle) return null;
    const fileHandle = await dirHandle.getFileHandle(AI_CONFIG_FILE);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
};
