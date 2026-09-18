import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { TEMPLATES } from "@/config/templates";
import { useResumeStore } from "@/store/useResumeStore";
import { initialResumeState } from "@/config/initialResumeData";
import { ResumeData, THEME_COLORS } from "@/types/resume";
import { TemplateCategory } from "@/types/template";
import { TemplateThumbnail } from "@/components/preview/TemplateThumbnail";
import { cn } from "@/lib/utils";

const sampleResumeBase: ResumeData = {
  ...(initialResumeState as unknown as ResumeData),
  id: "sample",
  createdAt: "",
  updatedAt: "",
  templateId: "classic",
};

const CATEGORIES: (TemplateCategory | "all")[] = ["all", "single"];

const CATEGORY_LABELS: Record<string, string> = {
  all: "全部",
  single: "单列",
};

// 模板库页面
export default function TemplatesPage() {
  const navigate = useNavigate();
  const createResume = useResumeStore((s) => s.createResume);
  const [category, setCategory] = React.useState<TemplateCategory | "all">("all");

  // 主题色轮播：每隔一段时间自动切换一个预设色，模板预览同步变色
  const [themeIndex, setThemeIndex] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setThemeIndex((i) => (i + 1) % THEME_COLORS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const sampleResume: ResumeData = React.useMemo(
    () => ({
      ...sampleResumeBase,
      globalSettings: {
        ...sampleResumeBase.globalSettings,
        themeColor: THEME_COLORS[themeIndex],
      },
    }),
    [themeIndex]
  );

  const filtered =
    category === "all" ? TEMPLATES : TEMPLATES.filter((item) => item.category === category);

  const handleUse = (templateId: string) => {
    const newId = createResume(templateId);
    navigate(`/workbench/${newId}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutGrid className="h-6 w-6 text-primary" />
            模板库
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">选择一套心仪的模板，开始制作你的简历</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          共 {TEMPLATES.length} 款模板
        </span>
      </motion.div>

      {/* 分类筛选 + 主题色轮播 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        {CATEGORIES.map((id) => {
          const active = category === id;
          return (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[id]}
            </button>
          );
        })}

        {/* 预设主题色：自动轮播，模板预览跟随变色 */}
        <div className="ml-auto flex items-center gap-2.5 rounded-full border border-border bg-background px-3 py-1.5">
          <span className="text-xs text-muted-foreground">主题</span>
          <div className="flex items-center gap-1.5">
            {THEME_COLORS.map((color, i) => {
              const active = i === themeIndex;
              return (
                <motion.button
                  key={color}
                  type="button"
                  onClick={() => setThemeIndex(i)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    scale: active ? 1.15 : 1,
                    boxShadow: active ? `0 0 0 2px ${color}55` : "0 0 0 0 rgba(0,0,0,0)",
                  }}
                  transition={{ duration: 0.25 }}
                  className="relative flex h-6 w-6 items-center justify-center rounded-full"
                  title={color}
                  aria-label={`主题色 ${color}`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: color }} />
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 模板卡片：与「我的简历」一致的递增入场 + 信息叠在预览图上 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <AnimatePresence mode="popLayout">
          {filtered.map((template, index) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
              transition={{
                delay: index * 0.06,
                duration: 0.25,
                ease: "easeOut",
                layout: { type: "tween", duration: 0.25, ease: "easeOut" },
              }}
              onClick={() => handleUse(template.id)}
              className="group relative cursor-pointer select-none overflow-hidden rounded-2xl border border-border/70 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.08)]"
            >
              {/* 模板预览铺满 */}
              <TemplateThumbnail
                templateId={template.id}
                sampleResume={{ ...sampleResume, templateId: template.id }}
              />

              {/* 底部渐变：保持原深浅，只缩小覆盖高度 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/85 via-black/50 to-transparent" />

              {/* hover 遮罩 + 「使用此模板」按钮 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUse(template.id);
                  }}
                  className="flex translate-y-1 items-center gap-1.5 rounded-full bg-black/70 px-5 py-2 text-sm font-medium text-white opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-primary"
                >
                  使用此模板
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* 底部信息：叠在预览图上 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="truncate text-sm font-semibold drop-shadow-sm">{template.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  <span>{CATEGORY_LABELS[template.category] || template.category}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
