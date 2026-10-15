import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import "./index.css";

// 页面按路由懒加载，首屏只加载当前页面所需代码，显著减小初始 JS
const HomePage = lazy(() => import("@/pages/HomePage"));
const DashboardLayout = lazy(() => import("@/pages/DashboardLayout"));
const ResumesPage = lazy(() => import("@/pages/ResumesPage"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const AISettingsPage = lazy(() => import("@/pages/AISettingsPage"));
const EasterEggPage = lazy(() => import("@/pages/EasterEggPage"));
const WorkbenchPage = lazy(() => import("@/pages/WorkbenchPage"));

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#1d1d1d]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-500" />
    </div>
  );
}

// 首次打开时若无任何简历，自动创建一份示例简历；此后用户删空则保持空列表
import { useResumeStore } from "@/store/useResumeStore";

function EnsureInitialResume() {
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const firstRunCreated = useResumeStore((s) => s.firstRunCreated);

  React.useEffect(() => {
    const state = useResumeStore.getState();
    if (!state.firstRunCreated) {
      if (Object.keys(state.resumes).length === 0) {
        state.createResume(null, false);
      }
      state.markFirstRunCreated();
    } else if (!activeResumeId && Object.keys(state.resumes).length > 0) {
      const firstId = Object.keys(state.resumes)[0];
      if (firstId) state.setActiveResume(firstId);
    }
  }, [resumes, activeResumeId, firstRunCreated]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <EnsureInitialResume />
      <HashRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<ResumesPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="ai" element={<AISettingsPage />} />
              <Route path="egg" element={<EasterEggPage />} />
            </Route>
            <Route path="/workbench/:id" element={<WorkbenchPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
