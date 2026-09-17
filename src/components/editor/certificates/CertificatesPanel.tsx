import React from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { RichTextarea } from "../shared/Field";

export function CertificatesPanel() {
  const content = useResumeStore((s) => s.activeResume?.certificatesContent) || "";
  const updateCertificatesContent = useResumeStore((s) => s.updateCertificatesContent);

  return (
    <div className="flex flex-col gap-2">
      <RichTextarea
        value={content}
        onChange={updateCertificatesContent}
        rows={10}
      />
    </div>
  );
}
