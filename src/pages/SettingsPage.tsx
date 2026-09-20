import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FolderSync,
  ShieldCheck,
  Trash2,
  Info,
  Settings2,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
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
import { LightSwitch } from "@/components/shared/LightSwitch";
import { cn } from "@/lib/utils";

// 设置页：备份目录配置（选择文件夹 → 自动保存简历与 AI 配置）
export default function SettingsPage() {
  const supported = useBackupStore((s) => s.supported);
  const isConfigured = useBackupStore((s) => s.isConfigured);
  const backupDir = useBackupStore((s) => s.backupDir);
  const configure = useBackupStore((s) => s.configure);
  const remove = useBackupStore((s) => s.remove);

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
    // 开启成功后，把现有简历与 AI 配置立即全部写入备份文件夹
    const resumes = useResumeStore.getState().resumes;
    Object.values(resumes).forEach((resume) => {
      saveResumeJson(resume.title, resume).catch(() => {});
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



  // 动画：各卡片依次入场
  const cardMotion = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" as const },
  };

  return (
    <div className="relative mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <LightSwitch />

      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            设置
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">配置自动备份文件夹与应用信息</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          数据仅保存在本地
        </span>
      </motion.div>

      {/* 数据与备份 */}
      <div className="flex flex-col gap-5">
        <motion.div {...cardMotion}>
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border/60 bg-muted/20 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/10">
                  <FolderSync className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[15px]">本地备份</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    选择一个本地文件夹，简历将自动同步为 JSON 文件，防止数据丢失。
                  </CardDescription>
                </div>
              </div>
              {isConfigured === null ? null : (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    isConfigured
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-background/60 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isConfigured ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )}
                  />
                  {isConfigured ? "已配置" : "未配置"}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {!supported ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    当前浏览器不支持文件夹访问（需要 Chrome / Edge 等 Chromium 内核浏览器），请更换浏览器后重试。
                  </span>
                </div>
              ) : isConfigured ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2.5">
                    <span className="flex min-w-0 shrink items-center gap-2 text-xs text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="shrink-0">备份文件夹</span>
                      <span className="truncate font-medium text-emerald-600 dark:text-emerald-400">
                        {backupDir ? `已授权：${backupDir}` : "已开启"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={handleConfigure} disabled={configuring}>
                        {configuring ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FolderSync className="h-3.5 w-3.5" />
                        )}
                        更换目录
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemoveOpen(true)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        移除
                      </Button>
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    简历与 AI 配置将自动保存为 JSON 文件到所选文件夹
                    （浏览器安全限制，不显示完整路径）
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <Button
                    onClick={handleConfigure}
                    disabled={configuring}
                    className="h-9 gap-2 px-4"
                  >
                    {configuring ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderSync className="h-4 w-4" />
                    )}
                    {configuring ? "选择中…" : "选择文件夹"}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    点击后弹出系统文件夹选择器；简历与 AI 配置将直接保存为 JSON
                    文件到所选文件夹，防止数据丢失
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

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
