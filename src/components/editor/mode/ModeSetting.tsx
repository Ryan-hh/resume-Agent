import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { SettingCard } from "../SettingCard";
import { Switch } from "@/components/ui/controls";

// 模式设置：图标模式 / 居中副标题 / 灵活头部
export function ModeSetting() {
  const gs = useResumeStore((s) => s.activeResume?.globalSettings) || {};
  const updateGlobalSettings = useResumeStore((s) => s.updateGlobalSettings);

  const useIconMode = gs.useIconMode ?? false;
  const centerSubtitle = gs.centerSubtitle ?? false;
  const flexibleHeaderLayout = gs.flexibleHeaderLayout ?? false;

  return (
    <SettingCard
      title="模式"
      icon={<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-4">
        <ModeRow
          label="图标模式"
          desc="使用图标代替文字标签"
          checked={useIconMode}
          onChange={(v) => updateGlobalSettings({ useIconMode: v })}
        />
        <ModeRow
          label="居中副标题"
          desc="基本信息中的职位居中显示"
          checked={centerSubtitle}
          onChange={(v) => updateGlobalSettings({ centerSubtitle: v })}
        />
        <ModeRow
          label="灵活头部布局"
          desc="基本信息字段自动换行排布"
          checked={flexibleHeaderLayout}
          onChange={(v) => updateGlobalSettings({ flexibleHeaderLayout: v })}
        />
      </div>
    </SettingCard>
  );
}

function ModeRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{desc}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
