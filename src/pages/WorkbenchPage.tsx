import React from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { useResumeStore } from "@/store/useResumeStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { LeftWorkspace, LeftMode } from "@/components/editor/LeftWorkspace";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { PreviewDock } from "@/components/preview/PreviewDock";
import { AIEditorPanel } from "@/components/ai/AIEditorPanel";

// 工作台（VS Code 三栏风格）：左侧操作区（内容编辑 / 切换模板 / 样式）+ 中间 A4 预览 + 右侧 AI 助手。
// 三个板块共用一个面板宽度，切换板块宽度不变，用户拖拽调整后同样保持。
export default function WorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const resumes = useResumeStore((s) => s.resumes);
  const setActiveResume = useResumeStore((s) => s.setActiveResume);
  const [mode, setMode] = React.useState<LeftMode>("content");
  // 窄窗口默认折叠 AI 面板，保证中间预览可用；宽屏（≥1200px）默认展开三栏
  const [aiOpen, setAiOpen] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1200
  );
  const aiPanelRef = React.useRef<ImperativePanelHandle>(null);

  const resume = id ? resumes[id] : undefined;

  React.useEffect(() => {
    if (id && resumes[id]) {
      setActiveResume(id);
    }
  }, [id, resumes, setActiveResume]);

  if (!resume) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EditorHeader />
      <div className="relative flex min-h-0 flex-1">
        <PanelGroup direction="horizontal" className="min-h-0 flex-1">
          {/* 左面板最小宽度 700px：拖窄/窗口缩小时左侧编辑区不再被压缩，保证表单布局稳定 */}
          <Panel defaultSize={40} minSize={34} maxSize={60} className="min-w-[700px]">
            <LeftWorkspace mode={mode} />
          </Panel>
          <PanelResizeHandle className="group relative flex w-px items-center justify-center bg-border outline-none">
            <div className="z-10 h-10 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-active:bg-primary" />
          </PanelResizeHandle>
          {/* 中间 A4 预览 */}
          <Panel defaultSize={45} minSize={26}>
            <div className="relative h-full">
              <PreviewPanel />
              <PreviewDock mode={mode} onModeChange={setMode} />
            </div>
          </Panel>
          {/* 右侧 AI 助手（可折叠） */}
          {aiOpen && (
            <>
              <PanelResizeHandle className="group relative flex w-px items-center justify-center bg-border outline-none">
                <div className="z-10 h-10 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-active:bg-primary" />
              </PanelResizeHandle>
              <Panel
                ref={aiPanelRef}
                defaultSize={15}
                minSize={10}
                maxSize={30}
                className="min-w-[280px]"
              >
                <AIEditorPanel resumeId={resume.id} onClose={() => setAiOpen(false)} />
              </Panel>
            </>
          )}
        </PanelGroup>

        {/* 折叠后从侧边唤出 AI 助手的入口 */}
        {!aiOpen && (
          <button
            onClick={() => setAiOpen(true)}
            className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-accent hover:text-foreground"
            title="展开 AI 助手"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI 助手
          </button>
        )}
      </div>
    </div>
  );
}
