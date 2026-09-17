import React from "react";
import { motion, useScroll } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useTranslations } from "@/i18n/zh";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 40));
    return () => unsub();
  }, [scrollY]);

  const navigate = useNavigate();
  const t = useTranslations();

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
        <span className="text-sm font-semibold">{t("common.title")}</span>
      </button>
      <Button size="sm" onClick={() => navigate("/")}>
        {t("home.hero.cta")}
      </Button>
    </motion.header>
  );
}

export function HeroSection() {
  const t = useTranslations();
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
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
          {t("home.hero.badge")}
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          {t("home.hero.title")}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("home.hero.subtitle")}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/")}>
            {t("home.hero.cta")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/templates")}>
            {t("home.hero.secondary")}
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

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

export function FeaturesSection() {
  const t = useTranslations();
  const features = [
    { title: t("home.features.realtime"), desc: t("home.features.realtimeDesc"), icon: "⚡" },
    { title: t("home.features.templates"), desc: t("home.features.templatesDesc"), icon: "🎨" },
    { title: t("home.features.privacy"), desc: t("home.features.privacyDesc"), icon: "🔒" },
    { title: t("home.features.export"), desc: t("home.features.exportDesc"), icon: "📤" },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <AnimatedFeature>
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("home.features.title")}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("home.features.subtitle")}</p>
      </AnimatedFeature>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <AnimatedFeature key={f.title} delay={i * 0.08}>
            <div className="group h-full rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl transition-transform duration-300 group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </AnimatedFeature>
        ))}
      </div>
    </section>
  );
}

export function CTASection() {
  const t = useTranslations();
  const navigate = useNavigate();
  return (
    <section className="px-6 py-20">
      <AnimatedFeature>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-blue-400/5 p-12 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-blob" />
          <h2 className="text-2xl font-bold sm:text-3xl">{t("home.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t("home.cta.subtitle")}</p>
          <Button size="lg" className="mt-6" onClick={() => navigate("/")}>
            {t("home.cta.button")}
          </Button>
        </div>
      </AnimatedFeature>
    </section>
  );
}

export function Footer() {
  const t = useTranslations();
  const { theme, systemTheme, setTheme } = useTheme();
  const resolved = theme === "system" ? systemTheme : theme;

  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
        <span>{t("home.footer.madeWith")} · {t("home.footer.privacy")}</span>
        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          {resolved === "dark" ? "☀️ 浅色" : "🌙 深色"}
        </button>
      </div>
    </footer>
  );
}
