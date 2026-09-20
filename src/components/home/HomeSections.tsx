import React from "react";
import { motion, useScroll } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Sparkles,
  Eye,
  LayoutTemplate,
  ListChecks,
  GripVertical,
  Plug,
  FileUp,
  ShieldCheck,
  Download,
  ArrowRight,
  Moon,
  Sun,
  Code2,
  Layers,
  Cpu,
  Bot,
  FileType2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- 顶部导航 ---------------- */
export function LandingHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 40));
    return () => unsub();
  }, [scrollY]);

  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300",
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-md" : "bg-transparent"
      )}
    >
      <button onClick={() => navigate("/")} className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">简历助手</span>
        <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          内置 AI · 智能小昊
        </span>
      </button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/templates")}>
          模板
        </Button>
        <Button size="sm" onClick={() => navigate("/")}>
          立即开始
        </Button>
      </div>
    </motion.header>
  );
}

/* ---------------- Hero ---------------- */
export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 pt-16 text-center">
      {/* 渐变光斑背景 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[20%] h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute right-[12%] top-[30%] h-[350px] w-[350px] rounded-full bg-blue-400/10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-[10%] left-[35%] h-[300px] w-[300px] rounded-full bg-purple-400/10 blur-3xl animate-blob" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10"
      >
        <span className="mb-6 inline-block rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          免费 · 本地存储 · 隐私安全 · 对话式编辑
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          用一句话，让
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent"> 智能小昊 </span>
          帮你改简历
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A4 实时预览、多套精美模板、一键导出 PDF。内置 AI 智能体理解你的指令，
          实时改写并可逐条撤销；所有数据只保存在你的浏览器里。
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/")}>
            立即开始 <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/templates")}>
            浏览模板
          </Button>
        </div>

        {/* 指标条 */}
        <div className="mx-auto mt-12 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {[
            { k: "6+", v: "简历模板" },
            { k: "3", v: "主流大模型接入" },
            { k: "0", v: "数据上传服务器" },
            { k: "PDF", v: "一键导出" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <div className="text-xl font-bold text-foreground">{s.k}</div>
              <div className="text-xs text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ---------------- 滚动动效包装 ---------------- */
export function AnimatedFeature({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <AnimatedFeature>
      <h2 className="text-center text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">{sub}</p>
    </AnimatedFeature>
  );
}

/* ---------------- 核心功能 ---------------- */
interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: Bot,
    title: "AI 智能小昊",
    desc: "基于 ReAct 工具调用的智能体，听懂「把这段经历润色一下」「换成蓝色主题」，直接落地修改。",
  },
  {
    icon: Eye,
    title: "A4 实时预览",
    desc: "三栏工作台，编辑即所见即所得，纸张比例、页边距与导出完全一致。",
  },
  {
    icon: LayoutTemplate,
    title: "多套模板",
    desc: "经典、极简、优雅、瑞士网格、蓝点、时间线等风格，一键切换不丢内容。",
  },
  {
    icon: Wand2,
    title: "富文本编辑",
    desc: "基于 Tiptap 的所见即所得编辑器，加粗、列表、字号字色、下划线一应俱全。",
  },
  {
    icon: GripVertical,
    title: "拖拽排序",
    desc: "板块与条目自由拖拽排序，随时显示 / 隐藏，按招聘方关注点重组简历结构。",
  },
  {
    icon: Plug,
    title: "多模型接入",
    desc: "兼容 OpenAI、Anthropic Claude、Google Gemini 及任意 OpenAI 兼容接口，自带密钥本地配置。",
  },
  {
    icon: FileUp,
    title: "智能导入",
    desc: "上传 PDF / Word / TXT / JSON / 图片，自动识别并填入对应板块，省去手抄。",
  },
  {
    icon: ShieldCheck,
    title: "本地隐私",
    desc: "所有简历与配置只存于浏览器本地，不上传任何服务器，隐私完全由你掌控。",
  },
  {
    icon: Download,
    title: "PDF 导出",
    desc: "基于 jsPDF + html2canvas 生成打印级 A4 PDF，排版还原度高，可直接投递。",
  },
];

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading title="产品功能" sub="围绕「写简历」这一件事，把每个环节做顺手" />
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <AnimatedFeature key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </AnimatedFeature>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 技术栈 ---------------- */
interface TechGroup {
  icon: LucideIcon;
  title: string;
  items: string[];
}

const TECH: TechGroup[] = [
  {
    icon: Layers,
    title: "前端框架",
    items: ["React 18", "TypeScript", "Vite 5", "React Router"],
  },
  {
    icon: Code2,
    title: "样式与动画",
    items: ["Tailwind CSS v4", "Framer Motion", "Ant Design 6", "Lucide Icons"],
  },
  {
    icon: Cpu,
    title: "AI 智能体",
    items: ["LangChain", "LangGraph", "ReAct 工具链", "多模型 Provider"],
  },
  {
    icon: FileType2,
    title: "编辑器与文档",
    items: ["Tiptap 富文本", "pdf.js 解析", "Mammoth (Word)", "jsPDF 导出"],
  },
  {
    icon: ListChecks,
    title: "状态与交互",
    items: ["Zustand", "@dnd-kit 拖拽", "@ant-design/x 对话", "html2canvas"],
  },
  {
    icon: ShieldCheck,
    title: "数据与安全",
    items: ["本地 localStorage", "Zod 校验", "无后端部署", "纯前端单页应用"],
  },
];

export function TechSection() {
  return (
    <section className="border-y border-border bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title="技术栈" sub="现代、轻量、可维护——一个纯前端单页应用" />
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TECH.map((g, i) => {
            const Icon = g.icon;
            return (
              <AnimatedFeature key={g.title} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-2xl border border-border bg-background p-6">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold">{g.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </AnimatedFeature>
            );
          })}
        </div>
        <AnimatedFeature delay={0.1}>
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
            架构上采用「数据驱动渲染」：简历数据以结构化 JSON 存储，模板是纯渲染函数；
            AI 智能体通过工具调用读写同一份数据，因此任何修改都能实时反映在 A4 预览上，
            并支持整体撤销。前端无独立后端，构建后为纯静态资源，可直接部署到任意静态托管。
          </p>
        </AnimatedFeature>
      </div>
    </section>
  );
}

/* ---------------- 三步流程 ---------------- */
const STEPS = [
  { n: "01", title: "创建简历", desc: "选一套模板，从空白或示例简历开始。" },
  { n: "02", title: "让智能小昊改", desc: "用自然语言描述需求，或直接用表单手动编辑。" },
  { n: "03", title: "导出投递", desc: "满意后一键导出 PDF，或随时回来继续修改。" },
];

export function StepsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading title="三步完成一份简历" sub="从打开到导出，全程无需注册" />
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <AnimatedFeature key={s.n} delay={i * 0.1}>
            <div className="relative h-full rounded-2xl border border-border bg-background p-6">
              <div className="font-mono text-3xl font-bold text-primary/25">{s.n}</div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </AnimatedFeature>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
export function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="px-6 py-20">
      <AnimatedFeature>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-blue-400/5 p-12 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-blob" />
          <h2 className="text-2xl font-bold sm:text-3xl">现在就创建你的简历</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            无需注册，打开即用，所有数据留在本地。
          </p>
          <Button size="lg" className="mt-6" onClick={() => navigate("/")}>
            免费开始 <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </AnimatedFeature>
    </section>
  );
}

/* ---------------- Footer ---------------- */
export function Footer() {
  const { theme, systemTheme, setTheme } = useTheme();
  const resolved = theme === "system" ? systemTheme : theme;

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          用 React + TypeScript 构建 · 数据仅保存在本地浏览器
        </span>
        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          {resolved === "dark" ? (
            <>
              <Sun className="h-3.5 w-3.5" /> 浅色
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5" /> 深色
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
