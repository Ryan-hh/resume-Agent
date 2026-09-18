import React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
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

type SectionShape = { id: string; title: string; icon: string; enabled: boolean; order: number };

// 横向模块导航条（dnd-kit 版）：位于表单上方，单行胶囊横排。
// - 拖拽排序：@dnd-kit/sortable horizontalListSortingStrategy（按住移动 8px 进入拖拽，
//   纯点击 = 切换板块；拖拽中 DragOverlay 浮动展示，原列表项让位不挤压）
// - 边缘自动滚动：dnd-kit 内置 autoScroll（加速度模型），滚动容器自动检测
// - 常显操作：眼睛（显隐）+ 删除（仅自定义板块）
// - 单行滚动：溢出时横向滚动 + 两端渐变遮罩 + 左右滚动按钮
export function SidePanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const reorderSections = useResumeStore((s) => s.reorderSections);
  const toggleSectionVisibility = useResumeStore((s) => s.toggleSectionVisibility);
  const setActiveSection = useResumeStore((s) => s.setActiveSection);
  const updateMenuSections = useResumeStore((s) => s.updateMenuSections);
  const createCustomSection = useResumeStore((s) => s.createCustomSection);
  const removeCustomData = useResumeStore((s) => s.removeCustomData);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canL, setCanL] = React.useState(false);
  const [canR, setCanR] = React.useState(false);

  // 注意：activeResume 就绪前组件会 return null（scrollRef 无 DOM）。
  // 空依赖只会在挂载时跑一次，刷新后首帧 activeResume 为 null → 监听全部丢失。
  // 依赖 hasResume：null → 有值 时重新注册监听，之后内容编辑不重跑。
  const hasResume = Boolean(activeResume);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanL(el.scrollLeft > 4);
      setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // 内容变化（增删板块/标题变长）也会改变 scrollWidth，ResizeObserver 感知不到，
    // 用 MutationObserver 兜底刷新左右可用状态
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    // 滚轮横向滚动：在导航条上滚动时，将垂直/水平滚轮量转为横向滚动
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY || e.deltaX;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", handleWheel);
      ro.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResume]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  if (!activeResume) return null;
  const sections = activeResume.menuSections || [];
  const activeSectionId = activeResume.activeSection || "basic";

  const basicSection = sections.find((s) => s.id === "basic");
  const otherSections = sections.filter((s) => s.id !== "basic");

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = otherSections.findIndex((s) => s.id === active.id);
    const newIndex = otherSections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(otherSections, oldIndex, newIndex);
    reorderSections(
      [basicSection, ...next.map((item, index) => ({ ...item, order: index + 1 }))].filter(
        Boolean
      ) as typeof sections
    );
  };

  const handleDragCancel = () => setActiveId(null);
  const activeSection = otherSections.find((s) => s.id === activeId);

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
    <div className="flex items-center border-b border-border bg-background">
      {/* 左箭头：固定占位，到最左时禁用 */}
      <button
        onClick={() => scrollBy(-1)}
        disabled={!canL}
        aria-label="向左滚动"
        className="flex h-12 w-9 shrink-0 select-none items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={scrollRef}
          className="scrollbar-hide flex h-12 min-w-0 select-none items-center gap-1 flex-1 overflow-x-auto"
        >
          {/* basic 固定项（不可拖拽，可点击切换） */}
          <div className="flex shrink-0 items-center">
            <Capsule
              section={{
                id: "basic",
                title: basicSection?.title || "基本信息",
                icon: "basic",
                enabled: true,
                order: 0,
              }}
              active={activeSectionId === "basic"}
              onSelect={() => setActiveSection("basic")}
            />
          </div>

          {/* 可拖拽排序的模块 */}
          <SortableContext
            items={otherSections.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            {otherSections.map((section) => (
              <SortableTab
                key={section.id}
                section={section}
                active={activeSectionId === section.id}
                onSelect={() => setActiveSection(section.id)}
                onToggleVisibility={() => toggleSectionVisibility(section.id)}
                onDelete={() => handleDelete(section.id)}
              />
            ))}
          </SortableContext>

          {/* 添加板块 */}
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
            className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border/80 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            添加板块
          </button>
        </div>

        {/* 拖拽浮层：跟随指针，不挤压列表布局 */}
        <DragOverlay>
          {activeSection ? <Capsule section={activeSection} active overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* 右箭头：固定占位，到最右时禁用 */}
      <button
        onClick={() => scrollBy(1)}
        disabled={!canR}
        aria-label="向右滚动"
        className="flex h-12 w-9 shrink-0 select-none items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SortableTab({
  section,
  active,
  onSelect,
  onToggleVisibility,
  onDelete,
}: {
  section: SectionShape;
  active: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("shrink-0 touch-none", isDragging && "opacity-40")}
    >
      <Capsule
        section={section}
        active={active}
        onSelect={onSelect}
        onToggleVisibility={onToggleVisibility}
        onDelete={onDelete}
      />
    </div>
  );
}

function Capsule({
  section,
  active,
  overlay,
  onSelect,
  onToggleVisibility,
  onDelete,
}: {
  section: SectionShape;
  active: boolean;
  overlay?: boolean;
  onSelect?: () => void;
  onToggleVisibility?: () => void;
  onDelete?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const hidden = !section.enabled;
  const isCustom = section.id.startsWith("custom-");
  const showOps = !overlay && (!!onToggleVisibility || (isCustom && !!onDelete));

  return (
    <div
      className={cn(
        "flex items-center rounded-lg transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        hidden && "opacity-55",
        overlay &&
          "border border-border bg-background/95 px-1.5 shadow-xl backdrop-blur"
      )}
    >
      <button
        onClick={onSelect}
        className={cn(
          "flex items-center gap-1.5 py-1.5 pl-2.5 pr-1 text-xs",
          !overlay && "cursor-grab active:cursor-grabbing"
        )}
      >
        <SectionIcon
          id={section.id}
          className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "")}
        />
        <span className="whitespace-nowrap">{section.title}</span>
      </button>
      {showOps && (
        <div className="flex items-center gap-0.5 pr-1.5">
          {onToggleVisibility && (
            <Tooltip content={hidden ? "显示该板块" : "隐藏该板块"}>
              <button
                onClick={onToggleVisibility}
                aria-label="显隐该板块"
                className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </Tooltip>
          )}
          {isCustom && onDelete && (
            <>
              <Tooltip content="删除该板块">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(true);
                  }}
                  aria-label="删除该板块"
                  className="rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Tooltip>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除「{section.title}」？</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后该板块内容将被清空，此操作不可恢复。
                    </AlertDialogDescription>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}


