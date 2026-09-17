import React from "react";
import { FolderSync, FolderOpen, FolderX, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useBackupStore } from "@/store/useBackupStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// 侧边栏「自动备份」入口：显示备份状态；点击展开操作菜单
export function BackupSidebarItem({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const supported = useBackupStore((s) => s.supported);
  const isConfigured = useBackupStore((s) => s.isConfigured);
  const backupDir = useBackupStore((s) => s.backupDir);
  const remove = useBackupStore((s) => s.remove);

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!supported) return null;

  const handleRemove = async () => {
    await remove();
    toast.success("已停止自动备份，现有简历数据不受影响");
  };

  const trigger = (
    <DropdownMenuTrigger
      aria-label="自动备份"
      title={collapsed ? "自动备份" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <span className="relative shrink-0">
        <FolderSync className="h-4 w-4" />
        {isConfigured === true && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
      </span>
      {!collapsed && <span className="truncate">自动备份</span>}
      {!collapsed && isConfigured === true && (
        <span className="ml-auto text-[10px] font-medium text-emerald-500">已开启</span>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu className="w-full">
      {collapsed ? (
        <Tooltip content="自动备份" className="w-full">
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent className="min-w-[11rem]">
        <div className="border-b border-border/60 px-2.5 py-2">
          <p className="text-xs font-medium text-foreground">自动备份</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {isConfigured === null
              ? "正在检测状态…"
              : isConfigured
                ? backupDir
                  ? `已开启：${backupDir}`
                  : "已开启"
                : "未开启：简历仅保存在浏览器本地"}
          </p>
        </div>
        {isConfigured ? (
          <>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <FolderOpen className="mr-2 h-4 w-4" />
              更换目录
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <FolderX className="mr-2 h-4 w-4" />
              停止备份
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings2 className="mr-2 h-4 w-4" />
            开启备份
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* 停止备份确认对话框 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              确认停止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}
