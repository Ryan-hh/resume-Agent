import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FolderSync, ShieldCheck, Trash2, Info } from "lucide-react";
import { useTranslations } from "@/i18n/zh";
import {
  setFileHandle,
  removeFileHandle,
  getFileHandle,
  verifyPermission,
  setConfig,
  getConfig,
  isFileSystemAccessSupported,
} from "@/utils/fileSystem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

// 设置页：备份目录配置
export default function SettingsPage() {
  const t = useTranslations();
  const [directoryPath, setDirectoryPath] = React.useState<string>("");
  const [isConfigured, setIsConfigured] = React.useState<boolean | null>(null);

  const supported = isFileSystemAccessSupported();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const handle = await getFileHandle("syncDirectory");
      if (!handle) {
        if (mounted) setIsConfigured(false);
        return;
      }
      const permission = await verifyPermission(handle);
      if (mounted) setIsConfigured(permission);
      const path = await getConfig("syncDirectoryPath");
      if (mounted) setDirectoryPath(path);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfigure = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      const permission = await verifyPermission(handle);
      if (!permission) {
        toast.error(t("dashboard.settings.backup.error"));
        return;
      }
      await setFileHandle("syncDirectory", handle);
      await setConfig("syncDirectoryPath", handle.name);
      setDirectoryPath(handle.name);
      setIsConfigured(true);
      toast.success(t("dashboard.settings.backup.configuredMsg"));
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(t("dashboard.settings.backup.error"));
      }
    }
  };

  const handleRemove = async () => {
    await removeFileHandle("syncDirectory");
    await setConfig("syncDirectoryPath", "");
    setDirectoryPath("");
    setIsConfigured(false);
    toast.success(t("dashboard.settings.backup.removed"));
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{t("dashboard.settings.title")}</h1>
      <div className="mt-6 flex flex-col gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderSync className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle>{t("dashboard.settings.backup.title")}</CardTitle>
                  <CardDescription className="mt-1">{t("dashboard.settings.backup.description")}</CardDescription>
                </div>
              </div>
              {isConfigured && <ShieldCheck className="h-5 w-5 text-emerald-500" />}
            </CardHeader>
            <CardContent>
              {!supported ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("dashboard.settings.backup.notSupported")}</span>
                </div>
              ) : isConfigured ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t("dashboard.settings.backup.path")}:</span>
                    <span className="font-mono text-xs">{directoryPath || "…"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleConfigure}>
                      {t("dashboard.settings.backup.change")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRemove} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      {t("dashboard.settings.backup.remove")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleConfigure}>
                  <FolderSync className="h-4 w-4" />
                  {t("dashboard.settings.backup.configure")}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.settings.about.title")}</CardTitle>
              <CardDescription>{t("dashboard.settings.about.description")}</CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
