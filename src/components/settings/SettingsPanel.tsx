import React from "react";
import { toast } from "sonner";
import {
  FolderSync,
  Trash2,
  Info,
  FolderOpen,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackupStore } from "@/store/useBackupStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useAIConfigStore } from "@/store/useAIConfigStore";
import { saveResumeJson, saveAiConfigFile } from "@/utils/fileSystem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

// 设置面板：备份目录配置 + 明暗模式切换（弹窗里用）
export function SettingsPanel() {
  const supported = useBackupStore((s) => s.supported);
  const isConfigured = useBackupStore((s) => s.isConfigured);
  const backupDir = useBackupStore((s) => s.backupDir);
  const configure = useBackupStore((s) => s.configure);
  const remove = useBackupStore((s) => s.remove);
  const { theme, setTheme } = useTheme();

  const [configuring, setConfiguring] = React.useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);

  const handleConfigure = async () => {
    setConfiguring(true);
    const result = await configure();
    setConfiguring(false);
    if (result.status === "error") {
      toast.error(result.message || "配置备份目录失败");
      return;
    }
    if (result.status === "canceled") return;
    toast.success("备份目录已配置");
    const resumes = useResumeStore.getState().resumes;
    Object.values(resumes).forEach((resume) => {
      saveResumeJson(resume.id, resume.title, resume).catch(() => {});
    });
    const aiConfig = useAIConfigStore.getState();
    saveAiConfigFile({ models: aiConfig.models, textModelId: aiConfig.textModelId }).catch(
      () => {}
    );
  };

  const handleRemove = async () => {
    await remove();
    toast.success("已移除备份目录");
  };

  return (
    <div className="flex flex-col divide-y divide-border">
      {/* 第一行：备份目录 */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <FolderSync className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">本地备份</div>
            <div className="text-xs text-muted-foreground">
              {isConfigured ? "已开启自动备份" : "选择文件夹自动保存简历"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!supported ? (
            <span className="text-xs text-muted-foreground">浏览器不支持</span>
          ) : isConfigured ? (
            <>
              <span className="max-w-[150px] truncate text-xs text-emerald-600 dark:text-emerald-400">
                {backupDir || "已开启"}
              </span>
              <Button variant="outline" size="sm" onClick={handleConfigure} disabled={configuring} className="w-16 justify-center">
                {configuring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "更换"}
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmRemoveOpen(true)}
                className="w-16 justify-center bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                删除
              </Button>
            </>
          ) : (
            <Button onClick={handleConfigure} disabled={configuring} className="min-w-[100px] justify-center">
              {configuring ? <Loader2 className="h-4 w-4 animate-spin" /> : "选择文件夹"}
            </Button>
          )}
        </div>
      </div>

      {/* 第二行：明暗模式 */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          {theme === "dark" ? (
            <Moon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Sun className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <div className="text-sm font-medium">外观模式</div>
            <div className="text-xs text-muted-foreground">
              {theme === "dark" ? "深色模式" : "浅色模式"}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "切换到浅色" : "切换到深色"}
        </Button>
      </div>

      {/* 停止备份确认对话框 */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停止自动备份？</AlertDialogTitle>
            <AlertDialogDescription>
              停止后简历与 AI 配置将不再自动保存到「{backupDir}」，已写入的 JSON
              文件不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
