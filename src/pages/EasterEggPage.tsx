import React from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { TipJarCard } from "@/components/settings/TipJarCard";

// 彩蛋页：目前只放「支持开发者」打赏板块
export default function EasterEggPage() {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center px-6 py-12">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 text-center"
      >
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          <Gift className="h-6 w-6 text-primary" />
          彩蛋
        </h1>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          这里藏着一个开发者的小小心愿
        </p>
      </motion.div>

      {/* 打赏板块：此页唯一内容 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full"
      >
        <TipJarCard />
      </motion.div>
    </div>
  );
}
