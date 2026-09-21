import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, LayoutTemplate, SlidersHorizontal } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { TEMPLATES, getTemplateById } from "@/config/templates";
import { initialResumeState } from "@/config/initialResumeData";
import { ResumeData } from "@/types/resume";
import { SidePanel } from "./SidePanel";
import { EditPanel } from "./EditPanel";
import { ThemeSetting } from "./theme/ThemeSetting";
import { TypographySetting } from "./typography/TypographySetting";
import { SpacingSetting } from "./spacing/SpacingSetting";
import { TemplateThumbnail } from "@/components/preview/TemplateThumbnail";
import { cn } from "@/lib/utils";

export type LeftMode = "content" | "template" | "style";

const MODE_META: Record<LeftMode, { label: string; icon: React.ElementType }> = {
  content: { label: "内容编辑", icon: FileText },
  template: { label: "切换模板", icon: LayoutTemplate },
  style: { label: "样式", icon: SlidersHorizontal },
};

// 左侧操作区：由右侧 Dock 按钮切换三种面板（内容编辑 / 切换模板 / 样式）
// 最小宽度 700px 由 WorkbenchPage 的 Panel 层保证（min-w-[700px]）
export function LeftWorkspace({ mode }: { mode: LeftMode }) {
  const meta = MODE_META[mode];
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {/* 头部：内容模式下横向模块导航即头部（与中/右面板等高）；其余模式显示模式名 */}
      {mode === "content" ? (
        <div className="shrink-0">
          <SidePanel />
        </div>
      ) : (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <meta.icon className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">{meta.label}</div>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full w-full"
          >
            {mode === "content" && <ContentWorkspace />}
            {mode === "template" && <TemplatePanel />}
            {mode === "style" && <StylePanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// 内容编辑：模块导航已作为左面板头部（LeftWorkspace 内），这里只剩表单
function ContentWorkspace() {
  return (
    <div className="h-full w-full overflow-hidden">
      <EditPanel />
    </div>
  );
}

const sampleResume: ResumeData = {
  ...(initialResumeState as unknown as ResumeData),
  id: "sample",
  createdAt: "",
  updatedAt: "",
  templateId: TEMPLATES[0].id,
};

// 切换模板：一排 3 个，卡片简洁精致——hover 高亮、选中淡蒙版 + 弹性对勾（从上一选中位置的方向滑入）
function TemplatePanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const currentTemplateId = getTemplateById(activeResume?.templateId).id;

  const COLS = 3;
  const [dir, setDir] = React.useState({ x: 0, y: 0 });

  // 点击时同步计算移动方向（左→右 / 右→左 / 上→下 / 下→上 / 斜向），确保动画方向与本次移动一致
  const handleSelect = (templateId: string) => {
    if (templateId === currentTemplateId) return;
    const prevIdx = TEMPLATES.findIndex((t) => t.id === currentTemplateId);
    const curIdx = TEMPLATES.findIndex((t) => t.id === templateId);
    if (prevIdx >= 0 && curIdx >= 0) {
      setDir({
        x: (curIdx % COLS) - (prevIdx % COLS),
        y: Math.floor(curIdx / COLS) - Math.floor(prevIdx / COLS),
      });
    }
    setTemplate(templateId);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((template, i) => {
            const isCurrent = template.id === currentTemplateId;
            return (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: "easeOut" }}
                onClick={() => handleSelect(template.id)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-none border bg-card text-left transition-all duration-200",
                  isCurrent
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:shadow-md"
                )}
              >
                {/* 缩略图区域 */}
                <div className="relative w-full overflow-hidden bg-white">
                  <TemplateThumbnail
                    templateId={template.id}
                    sampleResume={{ ...sampleResume, templateId: template.id }}
                  />
                  {/* 选中态：淡蒙版 + 居中对勾（从方向侧滑入） */}
                  <AnimatePresence>
                    {isCurrent && (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0, x: -dir.x * 90, y: -dir.y * 90 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: dir.x * -30, y: dir.y * -30 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center bg-primary/10"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* 名称行 */}
                <div
                  className={cn(
                    "flex w-full items-center justify-between gap-1 px-2.5 py-2",
                    isCurrent && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "truncate text-xs font-medium",
                      isCurrent ? "text-primary" : "text-foreground"
                    )}
                  >
                    {template.name}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 text-[10px] font-medium text-primary">使用中</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 样式：主题 / 字体 / 间距
function StylePanel() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="@container scrollbar-hide flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <ThemeSetting />
          <TypographySetting />
          <SpacingSetting />
        </div>
      </div>
    </div>
  );
}
