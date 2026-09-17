import React from "react";
import { Type } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { FONT_OPTIONS } from "@/config/constants";
import { SettingCard } from "../SettingCard";
import { Select, Slider } from "@/components/ui/controls";

// 排版设置：字体（中文名）/ 行高 / 字号（百分比拖动）
export function TypographySetting() {
  const gs = useResumeStore((s) => s.activeResume?.globalSettings) || {};
  const updateGlobalSettings = useResumeStore((s) => s.updateGlobalSettings);

  const fontFamily = gs.fontFamily || FONT_OPTIONS[0].value;
  const lineHeight = gs.lineHeight ?? 1.5;
  const baseFontSize = gs.baseFontSize ?? 16;

  const currentPct = Math.round((baseFontSize / 16) * 100);

  const applySize = (base: number) => {
    updateGlobalSettings({
      baseFontSize: base,
      headerSize: base + 2,
      subheaderSize: base,
    });
  };

  return (
    <SettingCard
      title="字体"
      icon={<Type className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-4">
        {/* 字体 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">字体</span>
          <Select
            value={fontFamily}
            onChange={(v) => updateGlobalSettings({ fontFamily: v })}
            options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
          />
        </div>

        {/* 行高 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">行高</span>
            <span className="text-xs font-medium">{lineHeight.toFixed(1)}</span>
          </div>
          <Slider
            value={lineHeight}
            onValueChange={(v) => updateGlobalSettings({ lineHeight: v })}
            min={1}
            max={2}
            step={0.1}
          />
        </div>

        {/* 字号：百分比拖动调节 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">字号</span>
            <span className="text-xs font-medium">{currentPct}%</span>
          </div>
          <Slider
            value={Math.min(125, Math.max(85, currentPct))}
            onValueChange={(v) => applySize(Math.round((16 * v) / 100))}
            min={85}
            max={125}
            step={5}
          />
        </div>
      </div>
    </SettingCard>
  );
}
