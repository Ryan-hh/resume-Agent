import React from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { RichTextarea } from "../shared/Field";

export function SelfEvaluationPanel() {
  const content = useResumeStore((s) => s.activeResume?.selfEvaluationContent) || "";
  const updateSelfEvaluationContent = useResumeStore((s) => s.updateSelfEvaluationContent);

  return (
    <div className="flex flex-col gap-2">
      <RichTextarea
        value={content}
        onChange={updateSelfEvaluationContent}
        rows={12}
        contextLabel="自我评价"
      />
    </div>
  );
}
