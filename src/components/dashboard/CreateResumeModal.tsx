import React from "react";
import { useNavigate } from "react-router-dom";
import { useResumeStore } from "@/store/useResumeStore";
import { TEMPLATES } from "@/config/templates";
import { initialResumeState } from "@/config/initialResumeData";
import { ResumeData } from "@/types/resume";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplateThumbnail } from "@/components/preview/TemplateThumbnail";

const sampleResume: ResumeData = {
  ...(initialResumeState as unknown as ResumeData),
  id: "sample",
  createdAt: "",
  updatedAt: "",
  templateId: "classic",
};

// 新建简历：从模板中选择创建（标题固定，仅模板列表滚动，无进入动画）
export function CreateResumeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const createResume = useResumeStore((s) => s.createResume);

  const handleCreate = (templateId: string) => {
    const newId = createResume(templateId);
    onOpenChange(false);
    navigate(`/workbench/${newId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-3xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>选择模板</DialogTitle>
          <DialogDescription>选择一套模板开始创建</DialogDescription>
        </DialogHeader>
        {/* 模板列表：独立滚动，标题不随滚动移动 */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreate(template.id)}
                className="flex flex-col gap-2 rounded-xl border border-border p-2 text-left transition-colors hover:border-primary/50 hover:shadow-md"
              >
                <div className="relative overflow-hidden rounded-lg border border-border bg-white">
                  <TemplateThumbnail
                    templateId={template.id}
                    sampleResume={{ ...sampleResume, templateId: template.id }}
                  />
                </div>
                <span className="truncate text-xs font-medium">{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
