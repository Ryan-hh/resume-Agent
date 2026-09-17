import React from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { RichTextarea } from "../shared/Field";

export function CustomPanel({ sectionId }: { sectionId: string }) {
  const raw = useResumeStore((s) => s.activeResume?.customData?.[sectionId]);
  // 兼容旧数据：customData 可能仍是条目数组，拼接各条目描述
  const content =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? (raw as Array<{ description?: string }>)
            .map((it) => it?.description || "")
            .filter(Boolean)
            .join("\n")
        : "";
  const updateCustomContent = useResumeStore((s) => s.updateCustomContent);

  return (
    <div className="flex flex-col gap-2">
      <RichTextarea
        value={content}
        onChange={(v) => updateCustomContent(sectionId, v)}
        rows={12}
      />
    </div>
  );
}
