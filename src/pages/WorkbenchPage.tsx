import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { PanelLeft, Eye, Bot, Loader2 } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { LeftWorkspace, LeftMode } from "@/components/editor/LeftWorkspace";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { PreviewDock } from "@/components/preview/PreviewDock";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// AI 助手面板按需加载（内含 LangChain，体积较大，避免拖慢工作台首屏）
const AIEditorPanel = lazy(() =>
  import("@/components/ai/AIEditorPanel").then((m) => ({ default: m.AIEditorPanel }))
);

type PanelKey = "left" | "preview" | "ai";
type PanelSizes = Record<PanelKey, number>; // 百分比，可见面板之和恒为 100

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// 拖拽热区：分隔条本身是 4px 宽的隐形热区，两侧再各扩展 8px（总命中 ~20px），
// 鼠标在面板"缝隙"附近左右偏差一点也能拖；不显示任何可见线条
const HIT_MARGIN = 8;

// 拖动分配：拖动目标面板 ± dx，邻居等量反方向。
// clamp 范围由"邻居可让出的量"决定（而不是各自 0–100），保证可见面板总和恒为 100%，
// 面板不会被拖出容器、也不会把相邻面板顶出界面。
function applyDelta(base: PanelSizes, kind: "left" | "right", dxPct: number): PanelSizes {
  if (kind === "left") {
    const left = clamp(base.left + dxPct, 0, base.left + base.preview);
    const preview = base.preview - (left - base.left);
    return { ...base, left, preview };
  }
  const preview = clamp(base.preview + dxPct, 0, base.preview + base.ai);
  const ai = base.ai - (preview - base.preview);
  return { ...base, preview, ai };
}

// 分隔条：纯拖拽热区（VS Code sash）——面板之间的间距由面板自身 padding 形成，
// 这里不渲染任何可见元素（无竖线、无背景），只有 ew-resize 光标提示可拖动。
// 绝对定位在面板交界处，不占布局宽度；热区 12px 宽，两侧再加 8px 命中余量。
// 拖拽事件由 WorkbenchPage 全局统一处理（body 全局 pointer 监听 + 热区命中检测）。
function PanelDivider({
  innerRef,
  label,
  onReset,
  onNudge,
  style,
}: {
  innerRef: React.Ref<HTMLDivElement>;
  label: string;
  onReset: () => void;
  onNudge: (dir: 1 | -1) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      ref={innerRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onNudge(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onNudge(1);
        }
      }}
      style={style}
      className="absolute bottom-0 top-0 z-20 w-3 -translate-x-1/2 cursor-ew-resize touch-none select-none outline-none"
    />
  );
}

// 工作台（VS Code 三栏风格）：左侧操作区 + 中间 A4 预览 + 右侧 AI 助手。
// - 自适应：面板宽度为百分比（可见面板恒为 100%），任意窗口宽度下按比例铺满
// - 拖拽调宽：模仿 VS Code sash / react-resizable-panels 的成熟实现——
//   全局 pointer 监听 + 热区命中检测 + 全局 cursor + clamp 后按实际生效位移分配
// - 动画：显隐面板（底部控制条 / AI 收起）时宽度 0↔目标% 平滑过渡；拖拽中禁动画保证跟手
export default function WorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const resumes = useResumeStore((s) => s.resumes);
  const setActiveResume = useResumeStore((s) => s.setActiveResume);
  const [mode, setMode] = React.useState<LeftMode>("content");

  // 面板显隐状态：宽屏默认全开，窄屏默认折叠 AI 面板
  const [open, setOpen] = React.useState<Record<PanelKey, boolean>>(() => ({
    left: true,
    preview: true,
    ai: typeof window !== "undefined" && window.innerWidth >= 1200,
  }));

  // 面板宽度（百分比）：每个板块一个固定初始值。AI 折叠时左+中铺满，AI 宽度保留待恢复。
  const [sizes, setSizes] = React.useState<PanelSizes>(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    return vw >= 1200
      ? { left: 34, preview: 46, ai: 20 }
      : { left: 42.5, preview: 57.5, ai: 20 };
  });
  const [dragging, setDragging] = React.useState(false);

  // 供全局事件回调读取的最新值（监听只绑一次，回调经 ref 取最新，避免重绑）
  const sizesRef = React.useRef<PanelSizes>(sizes);
  sizesRef.current = sizes;
  const leftDividerRef = React.useRef<HTMLDivElement>(null);
  const rightDividerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ kind: "left" | "right"; startX: number; base: PanelSizes } | null>(
    null
  );
  const cursorStyleRef = React.useRef<HTMLStyleElement | null>(null);

  // 容器宽度：拖动位移 → 百分比换算用
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [cw, setCw] = React.useState(0);
  const cwRef = React.useRef(0);
  cwRef.current = cw;
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setCw(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const resume = id ? resumes[id] : undefined;

  React.useEffect(() => {
    if (id && resumes[id]) {
      setActiveResume(id);
    }
  }, [id, resumes, setActiveResume]);

  // 撤销 / 重做快捷键（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y），顶部栏移除后保留在这里
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // 全局拖拽：VS Code sash 模式——body 上 capture 监听 pointerdown，
  // 命中分隔条热区即进入拖拽；随后全局 pointermove/up 驱动，不依赖元素事件，重渲染不打断。
  React.useEffect(() => {
    const body = document.body;
    const setGlobalCursor = (cur: string) => {
      if (!cursorStyleRef.current) {
        const el = document.createElement("style");
        document.head.appendChild(el);
        cursorStyleRef.current = el;
      }
      cursorStyleRef.current.textContent = `*{cursor: ${cur} !important;}`;
    };
    const resetGlobalCursor = () => {
      cursorStyleRef.current?.remove();
      cursorStyleRef.current = null;
    };

    const hitDivider = (x: number, y: number): "left" | "right" | null => {
      const test = (el: HTMLDivElement | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return (
          x >= r.left - HIT_MARGIN && x <= r.right + HIT_MARGIN && y >= r.top && y <= r.bottom
        );
      };
      if (test(leftDividerRef.current)) return "left";
      if (test(rightDividerRef.current)) return "right";
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const kind = hitDivider(e.clientX, e.clientY);
      if (!kind) return;
      e.preventDefault();
      dragRef.current = { kind, startX: e.clientX, base: sizesRef.current };
      setDragging(true);
      setGlobalCursor("ew-resize");
    };
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const width = cwRef.current;
      if (width <= 0) return;
      const dxPct = ((e.clientX - drag.startX) / width) * 100;
      setSizes(applyDelta(drag.base, drag.kind, dxPct));
    };
    const onPointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragging(false);
        resetGlobalCursor();
      }
    };
    body.addEventListener("pointerdown", onPointerDown, { capture: true });
    body.addEventListener("pointermove", onPointerMove);
    body.addEventListener("pointerup", onPointerUp);
    body.addEventListener("pointercancel", onPointerUp);
    return () => {
      body.removeEventListener("pointerdown", onPointerDown, { capture: true });
      body.removeEventListener("pointermove", onPointerMove);
      body.removeEventListener("pointerup", onPointerUp);
      body.removeEventListener("pointercancel", onPointerUp);
      resetGlobalCursor();
    };
  }, []);

  if (!resume) {
    return <Navigate to="/" replace />;
  }

  const openCount = [open.left, open.preview, open.ai].filter(Boolean).length;

  // 显隐面板：
  // - 隐藏：该面板宽度原样保留，其余可见面板按比例加回（可见面板恒为 100%）
  // - 显示：该面板用保留宽度（精确回到隐藏前），其余可见面板按比例让出空间（总和仍 100%）。
  //   若显示时也按比例分摊，其他面板已占满 100%，该面板每次只能分到更小份额 → 连续切换会越来越窄。
  const togglePanel = (key: PanelKey) => {
    const isOpen = open[key];
    // 最后一个可见板块不允许隐藏
    if (isOpen && openCount <= 1) return;
    const nextOpen = { ...open, [key]: !isOpen };
    const nextSizes = { ...sizes };
    const keys: PanelKey[] = ["left", "preview", "ai"];
    if (isOpen) {
      // 隐藏：其余可见面板按比例放大到 100%
      const visible = keys.filter((k) => nextOpen[k]);
      const sumVisible = visible.reduce((s, k) => s + sizes[k], 0) || 1;
      visible.forEach((k) => {
        nextSizes[k] = Math.round((sizes[k] / sumVisible) * 1000) / 10;
      });
    } else {
      // 显示：该面板回到保留宽度，其余可见面板按比例让出
      const others = keys.filter((k) => k !== key && nextOpen[k]);
      const othersSum = others.reduce((s, k) => s + sizes[k], 0) || 1;
      const scale = Math.max(0, (100 - sizes[key]) / othersSum);
      others.forEach((k) => {
        nextSizes[k] = Math.round(sizes[k] * scale * 10) / 10;
      });
    }
    setSizes(nextSizes);
    setOpen(nextOpen);
  };

  // 双击分隔条：相邻两面板均分
  const resetDivider = (kind: "left" | "right") => {
    if (kind === "left") {
      const mid = (sizes.left + sizes.preview) / 2;
      setSizes({ ...sizes, left: mid, preview: mid });
    } else {
      const mid = (sizes.preview + sizes.ai) / 2;
      setSizes({ ...sizes, preview: mid, ai: mid });
    }
  };

  // 键盘方向键微调（聚焦分隔条后 ←/→ 每次 2%）
  const nudgeDivider = (kind: "left" | "right") => (dir: 1 | -1) => {
    setSizes(applyDelta(sizesRef.current, kind, dir * 2));
  };

  // 显隐动画：面板宽度平滑过渡；拖拽中禁动画保证跟手
  const panelTransition = dragging
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const };

  const dockItems: { key: PanelKey; icon: React.ElementType; label: string; isOpen: boolean }[] = [
    { key: "left", icon: PanelLeft, label: "编辑", isOpen: open.left },
    { key: "preview", icon: Eye, label: "预览", isOpen: open.preview },
    { key: "ai", icon: Bot, label: "AI 助手", isOpen: open.ai },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background p-3">
      <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* 左面板：编辑表单区（左侧竖排工具栏 + 表单内容） */}
        <AnimatePresence initial={false}>
          {open.left && (
            <motion.div
              key="left"
              initial={{ width: "0%" }}
              animate={{ width: `${sizes.left}%` }}
              exit={{ width: "0%" }}
              transition={panelTransition}
              className="h-full min-w-0 shrink-0 overflow-hidden"
            >
              {/* p-1 形成面板间的小间距（两个面板各 4px → 视觉缝隙 8px），不占 flex 宽度 */}
              <div className="h-full p-1">
                <div className="flex h-full overflow-hidden rounded-xl border border-border bg-background">
                  <PreviewDock mode={mode} onModeChange={setMode} />
                  <div className="min-w-0 flex-1">
                    <LeftWorkspace mode={mode} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {open.left && open.preview && (
          <PanelDivider
            innerRef={leftDividerRef}
            label="调整左侧编辑区宽度"
            onReset={() => resetDivider("left")}
            onNudge={nudgeDivider("left")}
            style={{ left: `${sizes.left}%` }}
          />
        )}

        {/* 中间：A4 简历预览 */}
        <AnimatePresence initial={false}>
          {open.preview && (
            <motion.div
              key="preview"
              initial={{ width: "0%" }}
              animate={{ width: `${sizes.preview}%` }}
              exit={{ width: "0%" }}
              transition={panelTransition}
              className="h-full min-w-0 shrink-0 overflow-hidden"
            >
              {/* p-1 形成面板间的小间距（两个面板各 4px → 视觉缝隙 8px），不占 flex 宽度 */}
              <div className="h-full p-1">
                <div className="relative h-full overflow-hidden rounded-xl border border-border bg-background">
                  <PreviewPanel />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {open.preview && open.ai && (
          <PanelDivider
            innerRef={rightDividerRef}
            label="调整右侧 AI 助手宽度"
            onReset={() => resetDivider("right")}
            onNudge={nudgeDivider("right")}
            style={{ left: `${sizes.left + sizes.preview}%` }}
          />
        )}

        {/* 右面板：AI 助手 */}
        <AnimatePresence initial={false}>
          {open.ai && (
            <motion.div
              key="ai"
              initial={{ width: "0%" }}
              animate={{ width: `${sizes.ai}%` }}
              exit={{ width: "0%" }}
              transition={panelTransition}
              className="h-full min-w-0 shrink-0 overflow-hidden"
            >
              {/* p-1 形成面板间的小间距（两个面板各 4px → 视觉缝隙 8px），不占 flex 宽度 */}
              <div className="h-full p-1">
                <div className="h-full overflow-hidden rounded-xl border border-border bg-background">
                  <Suspense
                    fallback={
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-xs">正在加载 AI 助手…</span>
                      </div>
                    }
                  >
                    <AIEditorPanel resumeId={resume.id} onClose={() => togglePanel("ai")} />
                  </Suspense>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部面板控制条：绝对定位悬浮在页面底部，不占用布局空间 */}
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur-md">
            {dockItems.map((item) => (
              <Tooltip key={item.key} content={item.label}>
                <button
                  onClick={() => togglePanel(item.key)}
                  aria-label={item.label}
                  aria-pressed={item.isOpen}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    item.isOpen
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}







