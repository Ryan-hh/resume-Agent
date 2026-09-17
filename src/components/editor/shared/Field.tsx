import React from "react";
import { cn } from "@/lib/utils";
import { Label, Input, Textarea } from "@/components/ui/input";
import { RichEditor } from "./RichEditor";

// 表单字段容器
export function Field({
  label,
  labelRight,
  children,
  className,
  hint,
}: {
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          {labelRight}
        </div>
      )}
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// 富文本编辑（Word 式所见即所得：加粗/斜体/颜色/列表），输出 HTML，防抖提交
export function RichTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return <RichEditor value={value} onChange={onChange} placeholder={placeholder} minRows={rows} />;
}

export { RichEditor };
