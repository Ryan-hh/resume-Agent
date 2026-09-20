import React from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

// 右上角拉灯绳：点击切换明暗主题，圆形扩散效果
export function LightSwitch() {
  const { theme, setTheme } = useTheme();
  const [pulling, setPulling] = React.useState(false);
  const [transitioning, setTransitioning] = React.useState(false);
  const [ripplePos, setRipplePos] = React.useState({ x: 0, y: 0 });
  const [isWide, setIsWide] = React.useState(true);

  React.useEffect(() => {
    const check = () => setIsWide(window.innerWidth > 1600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isWide) return null;

  const handlePull = (e: React.MouseEvent) => {
    setPulling(true);
    setRipplePos({ x: e.clientX, y: e.clientY });
    const toDark = theme === "light";

    // 使用 View Transitions API 实现圆形揭示效果
    // 圆内是新主题，圆外是旧主题
    const doc = document as any;
    if (doc.startViewTransition) {
      const transition = doc.startViewTransition(() => {
        setTheme(toDark ? "dark" : "light");
      });

      // 做圆形扩散动画
      transition.ready.then(() => {
        const endRadius = Math.hypot(
          Math.max(e.clientX, window.innerWidth - e.clientX),
          Math.max(e.clientY, window.innerHeight - e.clientY)
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${e.clientX}px ${e.clientY}px)`,
              `circle(${endRadius}px at ${e.clientX}px ${e.clientY}px)`,
            ],
          },
          {
            duration: 400,
            easing: "ease-out",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    } else {
      // 降级方案：不支持 View Transitions 时直接切换
      setTheme(toDark ? "dark" : "light");
    }

    setTimeout(() => {
      setPulling(false);
    }, 500);
  };

  return (
    <>
      {/* 右上角拉灯绳 */}
      <div className="fixed right-6 top-0 z-50 flex flex-col items-center">
        {/* 绳子：上端延伸到页面外，拉的时候不会露出空白 */}
        <div className="-mt-20 h-48 w-0.5 bg-muted-foreground/30" />
        {/* 灯泡 */}
        <motion.button
          onClick={handlePull}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 shadow-md transition-all hover:scale-110 hover:shadow-lg"
          animate={pulling ? { y: [0, 14, -6, 0] } : { y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <Lightbulb
            className={`h-5 w-5 transition-colors ${
              theme === "dark" ? "text-yellow-400" : "text-yellow-500"
            }`}
          />
        </motion.button>
      </div>
    </>
  );
}
