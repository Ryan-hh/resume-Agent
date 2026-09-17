import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FolderSync, X } from "lucide-react";
import { useBackupStore } from "@/store/useBackupStore";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "resume-backup-banner-dismissed";

// 启动引导横幅：未开启自动备份时在仪表盘顶部提示一次，可「稍后再说」关闭
export function BackupBanner() {
  const navigate = useNavigate();
  const supported = useBackupStore((s) => s.supported);
  const isConfigured = useBackupStore((s) => s.isConfigured);

  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const show = supported && isConfigured === false && !dismissed;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: "auto" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="mx-auto w-full max-w-7xl overflow-hidden px-6 lg:px-8"
        >
          <div className="pt-6">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-background to-blue-400/5 px-4 py-3.5 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FolderSync className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">开启自动备份，简历数据更安全</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  选择一个本地文件夹，简历与 AI 配置将自动保存为 JSON 文件，防止数据丢失
                </p>
              </div>
              <Button size="sm" onClick={() => navigate("/settings")} className="shrink-0 gap-1.5">
                <FolderSync className="h-3.5 w-3.5" />
                立即开启
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="稍后再说"
                title="稍后再说"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
