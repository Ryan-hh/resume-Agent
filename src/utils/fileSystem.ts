// File System Access API 封装（备份目录同步用，仅 Chromium 系支持）

const HANDLE_KEYS = {
  syncDirectory: "resume-sync-directory-handle",
} as const;

const CONFIG_KEYS = {
  syncDirectoryPath: "resume-sync-directory-path",
} as const;

export const getFileHandle = async (
  key: keyof typeof HANDLE_KEYS
): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const idb = await openDatabase();
    return await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      const tx = idb.transaction("handles", "readonly");
      const store = tx.objectStore("handles");
      const request = store.get(HANDLE_KEYS[key]);
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const setFileHandle = async (
  key: keyof typeof HANDLE_KEYS,
  handle: FileSystemDirectoryHandle
) => {
  try {
    const idb = await openDatabase();
    return await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      store.put(handle, HANDLE_KEYS[key]);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

export const removeFileHandle = async (key: keyof typeof HANDLE_KEYS) => {
  try {
    const idb = await openDatabase();
    return await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      store.delete(HANDLE_KEYS[key]);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

export const getConfig = async (key: keyof typeof CONFIG_KEYS): Promise<string> => {
  try {
    return localStorage.getItem(CONFIG_KEYS[key]) || "";
  } catch {
    return "";
  }
};

export const setConfig = async (key: keyof typeof CONFIG_KEYS, value: string) => {
  try {
    localStorage.setItem(CONFIG_KEYS[key], value);
  } catch {
    // ignore
  }
};

export const verifyPermission = async (
  handle: FileSystemDirectoryHandle
): Promise<boolean> => {
  try {
    const options = { mode: "readwrite" };
    const anyHandle = handle as unknown as {
      queryPermission?: (o: { mode: string }) => Promise<string>;
      requestPermission?: (o: { mode: string }) => Promise<string>;
    };
    if (!anyHandle.queryPermission || !anyHandle.requestPermission) return true;
    if ((await anyHandle.queryPermission(options)) === "granted") return true;
    if ((await anyHandle.requestPermission(options)) === "granted") return true;
    return false;
  } catch {
    return false;
  }
};

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

export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
};
