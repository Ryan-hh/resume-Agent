import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileText, LayoutTemplate, Settings, Sparkles, ChevronLeft, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { BackupBanner } from "@/components/dashboard/BackupBanner";
import { useBackupStore } from "@/store/useBackupStore";

// 仪表盘布局：左侧可折叠导航 + 内容区
export default function DashboardLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  // 挂载时从 IndexedDB 恢复备份目录状态（句柄已持久化，刷新后需重新读取，
  // 否则设置页会显示"未配置"）
  const refreshBackup = useBackupStore((s) => s.refresh);
  React.useEffect(() => {
    void refreshBackup();
  }, [refreshBackup]);

  const navItems = [
    { to: "/", icon: FileText, label: "我的简历", end: true },
    { to: "/templates", icon: LayoutTemplate, label: "模板库" },
    { to: "/ai", icon: Sparkles, label: "AI 配置" },
    { to: "/settings", icon: Settings, label: "设置" },
    { to: "/egg", icon: Gift, label: "彩蛋" },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted/30">
      <aside
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* 品牌 */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border/80",
            collapsed ? "justify-center px-0" : "px-4"
          )}
        >
          <button onClick={() => navigate("/")} className="group flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <FileText className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">简历助手</span>
                <span className="truncate text-[10px] text-muted-foreground">在线简历制作</span>
              </span>
            )}
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          <p className={cn("px-3 pb-1.5 text-[10px] font-medium tracking-wider text-muted-foreground/70", collapsed && "hidden")}>
            工作台
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 主题切换：固定在导航下方 */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 border-t border-border/80 px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <ThemeToggle />
          {!collapsed && <span className="text-sm text-muted-foreground">主题</span>}
        </div>

        {/* 底部：收起 */}
        <div className="flex shrink-0 flex-col border-t border-border/80">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-2 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed ? "justify-center px-0" : "px-6 justify-start"
            )}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "收起"}
          </button>
        </div>
      </aside>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
        <BackupBanner />
        <Outlet />
      </main>
    </div>
  );
}
