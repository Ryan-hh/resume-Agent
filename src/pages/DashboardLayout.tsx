import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FileText,
  LayoutTemplate,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { BackupBanner } from "@/components/dashboard/BackupBanner";
import { useBackupStore } from "@/store/useBackupStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

// 仪表盘布局：TypeSafe 控制台风格窄栏
// - 纯白栏 + 扁平导航：激活项中性灰圆角块，无品牌色 / 无左侧色条 / 无分组标签
// - 顶部纯文字字标 + 收起按钮；收起后只剩展开按钮
// - 收起动画：宽度 200ms ease-out 直接变窄；图标统一 pl-6（中心恒在 32px = 窄栏中线，不左右跳）；
//   文字随宽度 max-width 收窄 + 淡出，不瞬间卸载
// - 底部仿它的用户卡：深色圆形头像 + 两行文字
export default function DashboardLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const refreshBackup = useBackupStore((s) => s.refresh);
  React.useEffect(() => {
    void refreshBackup();
  }, [refreshBackup]);

  const navItems = [
    { to: "/", icon: FileText, label: "我的简历", end: true },
    { to: "/templates", icon: LayoutTemplate, label: "模板库" },
    { to: "/ai", icon: Sparkles, label: "AI 配置" },
    { to: "/egg", icon: Gift, label: "彩蛋" },
  ];

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r border-border/60 bg-[#fafafa] transition-[width] duration-100 ease-out dark:bg-background",
          collapsed ? "w-12 overflow-visible" : "w-60 overflow-hidden"
        )}
      >
        {/* 顶：纯文字字标 + 收起按钮；收起后只剩展开按钮 */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center",
            collapsed ? "justify-center px-0" : "px-5",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black dark:bg-white">
                <span className="text-base font-bold text-white dark:text-black">H</span>
              </div>
              <span className="truncate text-lg font-semibold tracking-tight text-foreground">
                小昊简历
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#7aa2f7]/20 hover:text-foreground",
              !collapsed && "ml-auto"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* 导航：扁平列表 */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {navItems.map((item) => (
            <div key={item.to} className="relative group/navitem">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-2.5 rounded-lg py-2 pl-[7px] pr-2 text-sm leading-none transition-colors",
                    isActive
                      ? "bg-foreground/8 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-[#7aa2f7]/20 hover:text-foreground"
                  )
                }
              >
                <item.icon className="block h-4 w-4 shrink-0" strokeWidth={2} />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 z-[999] ml-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/navitem:opacity-100">
                  {item.label}
                </div>
              )}
            </div>
          ))}

          {/* 设置按钮：固定在导航列表最下面 */}
          <div className="relative group/navitem mt-auto">
            <button
              onClick={handleSettingsClick}
              className="group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-[7px] pr-2 text-sm leading-none text-muted-foreground transition-colors hover:bg-[#7aa2f7]/20 hover:text-foreground"
            >
              <Settings className="block h-4 w-4 shrink-0" strokeWidth={2} />
              {!collapsed && <span className="whitespace-nowrap">设置</span>}
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 z-[999] ml-4 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/navitem:opacity-100">
                设置
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* 设置弹窗 */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto dark:bg-[#1d1d1d]">
        <BackupBanner />
        <Outlet />
      </main>
    </div>
  );
}
