import React from "react";
import { RotateCcw, Ruler } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { SettingCard } from "../SettingCard";
import { Slider } from "@/components/ui/controls";

// 默认间距值
const DEFAULT_SPACING = {
  pagePadding: 32,
  sectionSpacing: 10,
  paragraphSpacing: 12,
};

// 间距设置：页边距 / 区块间距 / 段落间距 + 恢复默认
export function SpacingSetting() {
  const gs = useResumeStore((s) => s.activeResume?.globalSettings) || {};
  const updateGlobalSettings = useResumeStore((s) => s.updateGlobalSettings);

  const pagePadding = gs.pagePadding ?? DEFAULT_SPACING.pagePadding;
  const sectionSpacing = gs.sectionSpacing ?? DEFAULT_SPACING.sectionSpacing;
  const paragraphSpacing = gs.paragraphSpacing ?? DEFAULT_SPACING.paragraphSpacing;

  const isDefault =
    pagePadding === DEFAULT_SPACING.pagePadding &&
    sectionSpacing === DEFAULT_SPACING.sectionSpacing &&
    paragraphSpacing === DEFAULT_SPACING.paragraphSpacing;

  const reset = () => updateGlobalSettings(DEFAULT_SPACING);

  return (
    <SettingCard
      title="间距"
      icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
      action={
        <button
          onClick={reset}
          disabled={isDefault}
          className={cnDisabled(isDefault)}
          title="恢复默认间距"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <SpacingRow
          label="页边距"
          value={pagePadding}
          min={0}
          max={80}
          onChange={(v) => updateGlobalSettings({ pagePadding: v })}
        />
        <SpacingRow
          label="区块间距"
          value={sectionSpacing}
          min={1}
          max={80}
          onChange={(v) => updateGlobalSettings({ sectionSpacing: v })}
        />
        <SpacingRow
          label="段落间距"
          value={paragraphSpacing}
          min={1}
          max={40}
          onChange={(v) => updateGlobalSettings({ paragraphSpacing: v })}
        />
      </div>
    </SettingCard>
  );
}

function cnDisabled(disabled: boolean) {
  return [
    "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
    disabled
      ? "cursor-not-allowed text-muted-foreground/30"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  ].join(" ");
}

function SpacingRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{value}</span>
      </div>
      <Slider
        value={clamp(value)}
        onValueChange={onChange}
        min={min}
        max={max}
      />
    </div>
  );
}
