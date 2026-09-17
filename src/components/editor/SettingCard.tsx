import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/zh";

// 设置卡容器
export function SettingCard({
  title,
  icon,
  action,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex w-full items-center justify-between gap-2 px-4 py-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium transition-colors hover:opacity-75"
        >
          {icon}
          <span className="truncate">{title}</span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5">
          {action}
          <button
            onClick={() => setOpen(!open)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={open ? "收起" : "展开"}
          >
            <motion.svg
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </motion.svg>
          </button>
        </span>
      </div>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-1">{children}</div>
      </motion.div>
    </div>
  );
}
