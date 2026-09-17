import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, Briefcase, Laptop, Rocket, Zap, User } from "lucide-react";
import { ResumeData } from "@/types/resume";

// AI 解析结果预览确认弹窗：确认后才写入简历，不直接覆盖任何数据
export function PdfImportPreview({
  resume,
  onCancel,
  onConfirm,
}: {
  resume: ResumeData | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const formatDate = (start: string, end: string, isPresent?: boolean) => {
    const s = start || "?";
    const e = isPresent ? "至今" : end || "?";
    return `${s} - ${e}`;
  };

  return (
    <Dialog open={!!resume} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>AI 解析结果</DialogTitle>
          <DialogDescription>
            已从文件中识别出以下内容，请核对后确认导入；确认后生成一份新简历，不会覆盖现有简历。
          </DialogDescription>
        </DialogHeader>
        {resume && (
          <div className="space-y-5 py-2">
            {/* 基本信息 */}
            <div>
              <p className="text-xl font-semibold">{resume.basic.name || resume.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[resume.basic.title, resume.basic.email, resume.basic.phone, resume.basic.location]
                  .filter(Boolean)
                  .join(" · ") || "未识别到联系方式"}
              </p>
            </div>

            {/* 教育背景 */}
            {resume.education.length > 0 && (
              <SectionBlock
                icon={<GraduationCap className="h-4 w-4" />}
                label="教育背景"
                count={resume.education.length}
              >
                {resume.education.map((item) => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    {[item.school, item.major, item.degree].filter(Boolean).join(" · ")}
                    {(item.startDate || item.endDate) && (
                      <span className="ml-2 text-xs opacity-70">
                        {formatDate(item.startDate, item.endDate)}
                      </span>
                    )}
                  </li>
                ))}
              </SectionBlock>
            )}

            {/* 工作经历 */}
            {resume.experience.length > 0 && (
              <SectionBlock
                icon={<Briefcase className="h-4 w-4" />}
                label="工作经历"
                count={resume.experience.length}
              >
                {resume.experience.map((item) => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    {[item.company, item.position].filter(Boolean).join(" · ")}
                    {(item.startDate || item.endDate) && (
                      <span className="ml-2 text-xs opacity-70">
                        {formatDate(item.startDate, item.endDate, item.isPresent)}
                      </span>
                    )}
                  </li>
                ))}
              </SectionBlock>
            )}

            {/* 实习经历 */}
            {resume.internship.length > 0 && (
              <SectionBlock
                icon={<Laptop className="h-4 w-4" />}
                label="实习经历"
                count={resume.internship.length}
              >
                {resume.internship.map((item) => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    {[item.company, item.position].filter(Boolean).join(" · ")}
                    {(item.startDate || item.endDate) && (
                      <span className="ml-2 text-xs opacity-70">
                        {formatDate(item.startDate, item.endDate, item.isPresent)}
                      </span>
                    )}
                  </li>
                ))}
              </SectionBlock>
            )}

            {/* 项目经历 */}
            {resume.projects.length > 0 && (
              <SectionBlock
                icon={<Rocket className="h-4 w-4" />}
                label="项目经历"
                count={resume.projects.length}
              >
                {resume.projects.map((item) => (
                  <li key={item.id} className="text-sm text-muted-foreground">
                    {[item.name, item.role].filter(Boolean).join(" · ")}
                    {(item.startDate || item.endDate) && (
                      <span className="ml-2 text-xs opacity-70">
                        {formatDate(item.startDate, item.endDate, item.isPresent)}
                      </span>
                    )}
                  </li>
                ))}
              </SectionBlock>
            )}

            {/* 技能 */}
            {resume.skillContent.trim() && (
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-medium">
                  <Zap className="h-4 w-4 text-primary" />
                  专业技能
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resume.skillContent
                    .replace(/<[^>]+>/g, "")
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .join("；")}
                </p>
              </div>
            )}

            {/* 无任何内容时提示 */}
            {!resume.education.length &&
              !resume.experience.length &&
              !resume.internship.length &&
              !resume.projects.length &&
              !resume.skillContent.trim() && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <User className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>未能识别出完整简历内容，建议检查文件是否清晰、是否为简历。</span>
                </div>
              )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm}>确认导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionBlock({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
        <span className="text-muted-foreground">({count})</span>
      </h3>
      <ul className="mt-2 space-y-1">{children}</ul>
    </div>
  );
}
