import React from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { RichTextarea } from "../shared/Field";

export function SkillsPanel() {
  const skillContent = useResumeStore((s) => s.activeResume?.skillContent) || "";
  const updateSkillContent = useResumeStore((s) => s.updateSkillContent);

  return (
    <div className="flex flex-col gap-2">
      <RichTextarea
        value={skillContent}
        onChange={updateSkillContent}
        placeholder="在这里填写你的技能清单"
        rows={16}
      />
    </div>
  );
}
