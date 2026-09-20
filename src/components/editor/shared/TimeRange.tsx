import React from "react";
import { MonthPicker } from "@/components/ui/month-picker";

// 起止时间输入：开始年月 - 结束年月；勾选「至今」后结束时间隐藏
export function TimeRangeInput({
  start,
  end,
  isPresent,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  isPresent?: boolean;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="relative flex items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <MonthPicker value={start} onChange={onStart} placeholder="开始年月" />
      </div>
      <div className="min-w-0 flex-1">
        {isPresent ? (
          <div className="flex h-9 items-center rounded-none border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
            至今
          </div>
        ) : (
          <MonthPicker value={end} onChange={onEnd} placeholder="结束年月" />
        )}
      </div>
      {/* 中间短横线：绝对定位悬浮在缝隙上，不参与布局，两侧表单宽度不受影响 */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 select-none text-muted-foreground">
        -
      </span>
    </div>
  );
}

// 「至今」勾选，置于时间 label 右侧
export function PresentToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--color-primary)]"
      />
      至今
    </label>
  );
}
