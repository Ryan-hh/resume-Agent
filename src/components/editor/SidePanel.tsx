import React from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { cn } from "@/lib/utils";
import { SectionIcon } from "./sectionIcons";
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

// 左侧导航：内容模块管理（点击切换编辑、拖拽排序、显隐、删除、添加模块）
export function SidePanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const reorderSections = useResumeStore((s) => s.reorderSections);
  const toggleSectionVisibility = useResumeStore((s) => s.toggleSectionVisibility);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const updateMenuSections = useResumeStore((s) => s.updateMenuSections);
  const createCustomSection = useResumeStore((s) => s.createCustomSection);
  const removeCustomData = useResumeStore((s) => s.removeCustomData);

  if (!activeResume) return null;
  const sections = activeResume.menuSections || [];
  const activeSectionId = activeResume.activeSection || "basic";

  const basicSection = sections.find((s) => s.id === "basic");
  const otherSections = sections.filter((s) => s.id !== "basic");

  const handleDelete = (sectionId: string) => {
    const remaining = sections.filter((s) => s.id !== sectionId);
    const index = sections.findIndex((s) => s.id === sectionId);
    const fallback = remaining[Math.max(0, index - 1)] || remaining[0];
    updateMenuSections(remaining);
    if (sectionId.startsWith("custom-")) {
      removeCustomData(sectionId);
    }
    if (activeSectionId === sectionId) {
      setActiveSection(fallback?.id || "basic");
    }
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="scrollbar-hide flex-1 overflow-y-auto px-2.5 py-4">
        {/* 内容：模块管理 */}
        <div className="flex flex-col gap-1.5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            内容
          </p>
          <div className="flex flex-col gap-0.5">
            {/* basic 固定项（可点击切换） */}
            <button
              onClick={() => setActiveSection("basic")}
              className={cn(
                "group relative flex w-full items-center gap-0.5 rounded-md py-2 pl-3 pr-2 text-sm transition-colors",
                activeSectionId === "basic"
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-200",
                  activeSectionId === "basic" ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                )}
              />
              {/* 与可拖拽项的手柄等宽占位，保持图标/文字与其他模块严格对齐 */}
              <span className="w-[22px] shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left">
                <SectionIcon
                  id="basic"
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    activeSectionId === "basic"
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{basicSection?.title || "基本信息"}</span>
              </span>
            </button>

            {/* 可排序模块 */}
            <Reorder.Group
              axis="y"
              values={otherSections}
              onReorder={(items) => {
                const newOrder = [
                  basicSection,
                  ...items.map((item, index) => ({ ...item, order: index + 1 })),
                ].filter(Boolean) as typeof sections;
                reorderSections(newOrder);
              }}
              className="flex flex-col gap-0.5"
            >
              {otherSections.map((section) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  active={activeSectionId === section.id}
                  onSelect={() => setActiveSection(section.id)}
                  onToggleVisibility={() => toggleSectionVisibility(section.id)}
                  onDelete={() => handleDelete(section.id)}
                />
              ))}
            </Reorder.Group>

            {/* 添加板块：点击直接新增一个自定义板块 */}
            <button
              onClick={() =>
                createCustomSection({
                  id: "custom",
                  title: "自定义板块",
                  icon: "custom",
                  enabled: true,
                  order: sections.length,
                })
              }
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              添加板块
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionItem({
  section,
  active,
  onSelect,
  onToggleVisibility,
  onDelete,
}: {
  section: { id: string; title: string; icon: string; enabled: boolean; order: number };
  active: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const hidden = !section.enabled;
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="group relative"
    >
      {/* 选中指示条 */}
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-200",
          active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
        )}
      />
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-md py-1 pl-3 pr-1 text-sm transition-colors",
          active ? "text-primary" : "text-muted-foreground",
          hidden && "opacity-55"
        )}
      >
        {/* 拖拽手柄：悬停时浮现 */}
        <button
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground active:cursor-grabbing"
          aria-label="拖拽排序"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {/* 模块主体：点击切换 */}
        <button
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors"
        >
          <SectionIcon
            id={section.id}
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span className="truncate">{section.title}</span>
        </button>
        {/* 操作区：悬停时浮现（选中项常显） */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            active && "opacity-100"
          )}
        >
          <Tooltip content={hidden ? "显示该板块" : "隐藏该板块"}>
            <button
              onClick={onToggleVisibility}
              className="rounded-md p-1.5 transition-colors hover:text-foreground"
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </Tooltip>
          <Tooltip content="删除该板块">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
              className="rounded-md p-1.5 transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{section.title}」？</AlertDialogTitle>
              <AlertDialogDescription>删除后该板块内容将被清空，此操作不可恢复。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Reorder.Item>
  );
}
