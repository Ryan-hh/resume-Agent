import React from "react";
import { Palette } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { THEME_COLORS } from "@/types/resume";
import { SettingCard } from "../SettingCard";
import { cn } from "@/lib/utils";

// 主题色设置：精选预设色，直接点击切换
export function ThemeSetting() {
  const themeColor = useResumeStore((s) => s.activeResume?.globalSettings.themeColor || "#000000");
  const setThemeColor = useResumeStore((s) => s.setThemeColor);

  return (
    <SettingCard
      title="主题色"
      icon={<Palette className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          {THEME_COLORS.map((color) => {
            const active = themeColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                  active ? "border-transparent" : "border-transparent hover:scale-105"
                )}
                style={active ? { borderColor: color } : undefined}
                title={color}
                aria-label={`主题色 ${color}`}
              >
                <span
                  className={cn("rounded-full transition-all duration-200", active ? "h-[18px] w-[18px]" : "h-7 w-7")}
                  style={{ background: color }}
                />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">点击色块即可切换简历主色调</p>
      </div>
    </SettingCard>
  );
}
