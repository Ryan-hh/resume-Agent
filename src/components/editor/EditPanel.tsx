import React from "react";
import { RotateCcw, Plus } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STANDARD_MODULES } from "@/config/modules";
import { Experience, Project, Education } from "@/types/resume";
import { SectionIcon } from "./sectionIcons";
import { BasicPanel } from "./basic/BasicPanel";
import { ExperiencePanel } from "./experience/ExperiencePanel";
import { InternshipPanel } from "./internship/InternshipPanel";
import { ProjectPanel } from "./project/ProjectPanel";
import { EducationPanel } from "./education/EducationPanel";
import { SkillsPanel } from "./skills/SkillsPanel";
import { SelfEvaluationPanel } from "./self-evaluation/SelfEvaluationPanel";
import { CertificatesPanel } from "./certificates/CertificatesPanel";
import { CustomPanel } from "./custom/CustomPanel";

// 编辑面板：按当前模块（由左侧导航选择）渲染对应表单，顶部支持重命名板块、恢复默认名称、快捷添加条目
export function EditPanel() {
  const activeResume = useResumeStore((s) => s.activeResume);
  const activeSectionId = activeResume?.activeSection || "basic";
  const menuSections = activeResume?.menuSections || [];

  const activeSection = menuSections.find((s) => s.id === activeSectionId);

  // basic 标题固定，其他模块标题可编辑
  const isBasic = activeSectionId === "basic";
  const [titleInput, setTitleInput] = React.useState(activeSection?.title || "");
  const [titleFocused, setTitleFocused] = React.useState(false);

  React.useEffect(() => {
    setTitleInput(activeSection?.title || "");
  }, [activeSection?.id, activeSection?.title]);

  const handleTitleChange = (value: string) => {
    setTitleInput(value);
    if (isBasic || !activeSection) return;
    // 实时同步：输入过程中直接写入 store，右侧预览与左侧内容栏同步更新
    const updatedSections = menuSections.map((s) =>
      s.id === activeSection.id ? { ...s, title: value } : s
    );
    useResumeStore.getState().updateMenuSections(updatedSections);
  };

  const handleTitleBlur = () => {
    setTitleFocused(false);
    if (isBasic || !activeSection) return;
    const trimmed = titleInput.trim();
    if (!trimmed) {
      // 输入为空时回退为原标题
      const updatedSections = menuSections.map((s) =>
        s.id === activeSection.id ? { ...s, title: activeSection.title } : s
      );
      useResumeStore.getState().updateMenuSections(updatedSections);
      setTitleInput(activeSection.title);
    }
  };

  // 恢复默认板块名称
  const handleResetTitle = () => {
    if (!activeSection) return;
    const defaultTitle = activeSection.id.startsWith("custom-")
      ? "自定义板块"
      : STANDARD_MODULES[activeSection.id]?.title || activeSection.title;
    const updatedSections = menuSections.map((s) =>
      s.id === activeSection.id ? { ...s, title: defaultTitle } : s
    );
    useResumeStore.getState().updateMenuSections(updatedSections);
    setTitleInput(defaultTitle);
  };

  // 标题栏右侧快捷添加（教育背景/工作经历/实习经历/项目经历）
  const handleAddItem = () => {
    const resume = useResumeStore.getState().activeResume;
    if (!resume) return;
    const now = Date.now();
    if (activeSectionId === "education") {
      const newItem: Education = {
        id: `edu-${now}`,
        school: "",
        major: "",
        degree: "",
        startDate: "",
        endDate: "",
        visible: true,
      };
      useResumeStore.getState().updateEducationBatch([...resume.education, newItem]);
    } else if (activeSectionId === "experience") {
      const newItem: Experience = {
        id: `exp-${now}`,
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        isPresent: false,
        details: "",
        visible: true,
      };
      useResumeStore.getState().updateExperienceBatch([...resume.experience, newItem]);
    } else if (activeSectionId === "internship") {
      const newItem: Experience = {
        id: `intern-${now}`,
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        isPresent: false,
        details: "",
        visible: true,
      };
      useResumeStore.getState().updateInternshipBatch([...resume.internship, newItem]);
    } else if (activeSectionId === "projects") {
      const newItem: Project = {
        id: `proj-${now}`,
        name: "",
        role: "",
        startDate: "",
        endDate: "",
        isPresent: false,
        description: "",
        visible: true,
      };
      useResumeStore.getState().updateProjectsBatch([...resume.projects, newItem]);
    }
  };

  const hasAddButton = ["education", "experience", "internship", "projects"].includes(activeSectionId);
  const addLabel: Record<string, string> = {
    education: "添加教育背景",
    experience: "添加工作经历",
    internship: "添加实习经历",
    projects: "添加项目",
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-background">
      {/* 顶部：当前模块标题（非基本信息可重命名 + 恢复默认）+ 快捷添加 */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <SectionIcon id={activeSectionId} className="h-4 w-4 shrink-0 text-muted-foreground" />
        {isBasic ? (
          <h2 className="flex h-7 w-44 items-center truncate border-b border-border px-1 text-sm font-semibold">
            基本信息
          </h2>
        ) : (
          <>
            <Input
              value={titleInput}
              onChange={(e) => handleTitleChange(e.target.value)}
              onFocus={() => setTitleFocused(true)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className={cn(
                "h-7 w-44 rounded-none border-0 border-b bg-transparent px-1 text-sm font-semibold shadow-none transition-colors focus-visible:ring-0",
                titleFocused ? "border-primary" : "border-border hover:border-foreground/40"
              )}
              title="点击修改板块名称"
            />
            <Tooltip content="恢复默认名称">
              <button
                type="button"
                onClick={handleResetTitle}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="恢复默认名称"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </>
        )}
        {hasAddButton && (
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 gap-1 px-2.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {addLabel[activeSectionId]}
            </Button>
          </div>
        )}
      </div>

      {/* 表单内容 */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4">
        <PanelContent sectionId={activeSectionId} />
      </div>
    </div>
  );
}

function PanelContent({ sectionId }: { sectionId: string }) {
  switch (sectionId) {
    case "basic":
      return <BasicPanel />;
    case "experience":
      return <ExperiencePanel />;
    case "internship":
      return <InternshipPanel />;
    case "projects":
      return <ProjectPanel />;
    case "education":
      return <EducationPanel />;
    case "skills":
      return <SkillsPanel />;
    case "selfEvaluation":
      return <SelfEvaluationPanel />;
    case "certificates":
      return <CertificatesPanel />;
    default:
      if (sectionId.startsWith("custom-")) {
        return <CustomPanel sectionId={sectionId} />;
      }
      return null;
  }
}
