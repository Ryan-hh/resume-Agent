import React from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { TipJarCard } from "@/components/settings/TipJarCard";

// 彩蛋页：目前只放「支持开发者」打赏板块（从设置页迁入）
export default function EasterEggPage() {
  const cardMotion = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" as const },
  };

  return (
    <div className="relative mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Gift className="h-6 w-6 text-primary" />
            彩蛋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            这里藏着一个开发者的小小心愿
          </p>
        </div>
      </motion.div>

      {/* 打赏板块：此页唯一内容 */}
      <div className="mx-auto max-w-2xl">
        <motion.div {...cardMotion}>
          <TipJarCard />
        </motion.div>
      </div>
    </div>
  );
}
