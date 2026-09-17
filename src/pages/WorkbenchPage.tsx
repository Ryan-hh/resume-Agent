import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useResumeStore } from "@/store/useResumeStore";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { LeftWorkspace, LeftMode } from "@/components/editor/LeftWorkspace";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { PreviewDock } from "@/components/preview/PreviewDock";

// 工作台：左右两部分 —— 左侧操作区（内容编辑 / 切换模板 / 样式，由右侧 Dock 切换）+ 右侧 A4 预览。
// 三个板块共用一个面板宽度，切换板块宽度不变，用户拖拽调整后同样保持。
export default function WorkbenchPage() {
  const { id } = useParams<{ id: string }>();
  const resumes = useResumeStore((s) => s.resumes);
  const setActiveResume = useResumeStore((s) => s.setActiveResume);
  const [mode, setMode] = React.useState<LeftMode>("content");

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
          <Panel defaultSize={42} minSize={34} maxSize={60} className="min-w-[700px]">
            <LeftWorkspace mode={mode} />
          </Panel>
          <PanelResizeHandle className="group relative flex w-px items-center justify-center bg-border outline-none">
            <div className="z-10 h-10 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary/60 group-active:bg-primary" />
          </PanelResizeHandle>
          <Panel defaultSize={58} minSize={28} className="min-w-[320px]">
            <PreviewPanel />
          </Panel>
        </PanelGroup>

        <PreviewDock mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );
}
