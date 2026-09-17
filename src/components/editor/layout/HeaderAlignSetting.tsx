import React from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { SettingCard } from "../SettingCard";
import { cn } from "@/lib/utils";

// 顶部对齐：基本信息头部（姓名/职位/信息字段）的对齐方式
export function HeaderAlignSetting() {
  const basic = useResumeStore((s) => s.activeResume?.basic);
  const updateBasicInfo = useResumeStore((s) => s.updateBasicInfo);

  if (!basic) return null;

  const options = [
    { value: "left" as const, label: "靠左", icon: AlignLeft },
    { value: "center" as const, label: "居中", icon: AlignCenter },
    { value: "right" as const, label: "靠右", icon: AlignRight },
  ];

  return (
    <SettingCard
      title="顶部对齐"
      icon={<AlignLeft className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateBasicInfo({ layout: opt.value })}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              basic.layout === opt.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        调整简历顶部姓名、职位与信息字段的对齐方式
      </p>
    </SettingCard>
  );
}
