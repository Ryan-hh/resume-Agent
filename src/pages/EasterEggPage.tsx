import React from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { TipJarCard } from "@/components/settings/TipJarCard";
import { LightSwitch } from "@/components/shared/LightSwitch";

// 彩蛋页：版式对齐设置页——标题靠左、容器 max-w-7xl，不再居中
export default function EasterEggPage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <LightSwitch />

      {/* 页头：靠左，同设置页 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          彩蛋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          请作者喝杯咖啡
        </p>
      </motion.div>

      {/* 打赏板块：此页唯一内容 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <TipJarCard />
      </motion.div>
    </div>
  );
}
